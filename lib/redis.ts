import Redis from 'ioredis';
import NodeCache from 'node-cache';
import { logError, logWarn, logInfo } from './logger';

// Track Redis connection status
let isRedisConnected = false;
let isRedisConnecting = false;
let lastConnectionAttempt = 0;
const RECONNECTION_COOLDOWN = 5000; // 5 seconds between reconnection attempts

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logWarn(`Redis retry attempt ${times}, waiting ${delay}ms`, { attempt: times, delay });

    // Stop retrying after 10 attempts
    if (times > 10) {
      logError('Redis max retry attempts reached, giving up', undefined, { attempts: times });
      return null;
    }

    return delay;
  }
});

// Global Redis event handlers
redis.on('connect', () => {
  isRedisConnected = true;
  isRedisConnecting = false;
  logInfo('Redis connection established', {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379',
    db: process.env.REDIS_DB || '0'
  });
});

redis.on('ready', () => {
  isRedisConnected = true;
  logInfo('Redis client ready');
});

redis.on('error', (error) => {
  logError('Redis connection error', error, {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || '6379'
  });

  // In production, this could trigger alerts
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send alert to monitoring service (PagerDuty, Slack, etc.)
  }
});

redis.on('close', () => {
  isRedisConnected = false;
  logWarn('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  isRedisConnecting = true;
  logInfo(`Redis reconnecting in ${delay}ms`);
});

redis.on('end', () => {
  isRedisConnected = false;
  isRedisConnecting = false;
  logWarn('Redis connection ended');
});

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  status: string;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    if (redis.status !== 'ready' && redis.status !== 'connect') {
      return {
        healthy: false,
        status: redis.status,
        error: `Redis status: ${redis.status}`
      };
    }

    await redis.ping();
    const latency = Date.now() - startTime;

    return {
      healthy: true,
      status: 'connected',
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      status: redis.status,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Safely connect to Redis with error handling
 */
export async function connectRedis(): Promise<boolean> {
  // Prevent concurrent connection attempts
  if (isRedisConnecting) {
    logWarn('Redis connection already in progress');
    return false;
  }

  // Implement cooldown between reconnection attempts
  const now = Date.now();
  if (now - lastConnectionAttempt < RECONNECTION_COOLDOWN) {
    logWarn('Redis reconnection cooldown active', {
      cooldownRemaining: RECONNECTION_COOLDOWN - (now - lastConnectionAttempt)
    });
    return false;
  }

  try {
    isRedisConnecting = true;
    lastConnectionAttempt = now;

    await redis.connect();
    return true;
  } catch (error) {
    logError('Failed to connect to Redis', error instanceof Error ? error : new Error(String(error)));
    isRedisConnecting = false;
    return false;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isRedisConnected && redis.status === 'ready';
}

// Memory cache for fastest access
const memoryCache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every minute
  useClones: false, // Better performance
});

// Cache configuration interface
export interface CacheOptions {
  memoryTTL?: number; // Memory cache TTL in seconds
  redisTTL?: number;  // Redis cache TTL in seconds
  skipMemory?: boolean; // Skip memory cache
  skipRedis?: boolean;  // Skip Redis cache
}

// Default cache options
const defaultOptions: CacheOptions = {
  memoryTTL: 300,  // 5 minutes
  redisTTL: 3600,  // 1 hour
  skipMemory: false,
  skipRedis: false,
};

export class CacheService {
  private redis: Redis;
  private memoryCache: NodeCache;

  constructor(redisInstance?: Redis, memoryCacheInstance?: NodeCache) {
    this.redis = redisInstance || redis;
    this.memoryCache = memoryCacheInstance || memoryCache;
    // Note: Redis event handlers are attached globally for better monitoring
  }

  /**
   * Get value from cache with fallback to fetch function
   */
  async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const opts = { ...defaultOptions, ...options };

    try {
      // Level 1: Memory cache (fastest)
      if (!opts.skipMemory) {
        try {
          const memoryResult = this.memoryCache.get<T>(key);
          if (memoryResult !== undefined) {
            return memoryResult;
          }
        } catch (memoryError) {
          // Memory cache error, fall back to L2
        }
      }

      // Level 2: Redis cache (distributed)
      if (!opts.skipRedis && isRedisAvailable()) {
        try {
          const redisResult = await this.redis.get(key);
          if (redisResult) {
            try {
              const parsed = JSON.parse(redisResult) as T;

              // Store in memory cache for next time
              if (!opts.skipMemory) {
                try {
                  this.memoryCache.set(key, parsed, opts.memoryTTL || 300);
                } catch (memoryError) {
                  logWarn('Memory cache set failed', { key, error: memoryError });
                }
              }

              return parsed;
            } catch (parseError) {
              logWarn('Redis cache value parse failed, invalidating', { key });
              // JSON parse failed, invalidate corrupted cache entry and fall back to fetch
              try {
                await this.redis.del(key);
              } catch (delError) {
                logWarn('Failed to delete corrupted cache entry', { key });
              }
            }
          }
        } catch (redisError) {
          logWarn('Redis get failed, falling back to fetch', {
            key,
            error: redisError instanceof Error ? redisError.message : String(redisError)
          });
        }
      }

      // Level 3: Fetch from source
      const fresh = await fetchFunction();

      // Cache at all levels
      const cachePromises: Promise<any>[] = [];

      if (!opts.skipRedis && isRedisAvailable()) {
        try {
          const redisPromise = this.redis.setex(key, opts.redisTTL || 3600, JSON.stringify(fresh));
          if (redisPromise && typeof redisPromise.catch === 'function') {
            cachePromises.push(
              redisPromise.catch(error => {
                logWarn('Redis cache set failed', { key, error: error instanceof Error ? error.message : String(error) });
              })
            );
          }
        } catch (error) {
          logWarn('Redis set error', { key, error: error instanceof Error ? error.message : String(error) });
        }
      }

      if (!opts.skipMemory) {
        try {
          this.memoryCache.set(key, fresh, opts.memoryTTL || 300);
        } catch (memoryError) {
          logWarn('Memory cache set failed during fetch', { key, error: memoryError });
        }
      }

      // Don't wait for caching to complete
      Promise.all(cachePromises);

      return fresh;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const opts = { ...defaultOptions, ...options };

    const cachePromises: Promise<any>[] = [];

    // Set in memory cache
    if (!opts.skipMemory) {
      try {
        this.memoryCache.set(key, value, opts.memoryTTL || 300);
      } catch (error) {
        logWarn('Memory cache set failed', { key, error });
      }
    }

    // Set in Redis cache
    if (!opts.skipRedis && isRedisAvailable()) {
      try {
        const redisPromise = this.redis.setex(key, opts.redisTTL || 3600, JSON.stringify(value));
        if (redisPromise && typeof redisPromise.catch === 'function') {
          cachePromises.push(
            redisPromise.catch(error => {
              logWarn('Redis set failed', { key, error: error instanceof Error ? error.message : String(error) });
            })
          );
        }
      } catch (error) {
        logWarn('Redis set error', { key, error: error instanceof Error ? error.message : String(error) });
      }
    }

    await Promise.all(cachePromises);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    const deletePromises: Promise<any>[] = [];

    // Delete from memory cache
    try {
      this.memoryCache.del(key);
    } catch (error) {
      logWarn('Memory cache delete failed', { key, error });
    }

    // Delete from Redis cache
    if (isRedisAvailable()) {
      try {
        const redisPromise = this.redis.del(key);
        if (redisPromise && typeof redisPromise.catch === 'function') {
          deletePromises.push(
            redisPromise.catch(error => {
              logWarn('Redis delete failed', { key, error: error instanceof Error ? error.message : String(error) });
            })
          );
        }
      } catch (error) {
        logWarn('Redis delete error', { key, error: error instanceof Error ? error.message : String(error) });
      }
    }

    await Promise.all(deletePromises);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache (simple approach - clear all)
    try {
      this.memoryCache.flushAll();
    } catch (error) {
      logWarn('Memory cache flush failed', { pattern, error });
    }

    // Clear Redis cache by pattern
    if (isRedisAvailable()) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redis.del(...keys);
          logInfo(`Invalidated ${keys.length} Redis keys`, { pattern });
        }
      } catch (error) {
        logWarn('Redis invalidate failed', {
          pattern,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryKeys = this.memoryCache.keys();
    return {
      memory: {
        keys: memoryKeys ? memoryKeys.length : 0,
        stats: this.memoryCache.getStats(),
      },
      redis: {
        status: this.redis.status,
        connected: isRedisConnected,
        connecting: isRedisConnecting,
        available: isRedisAvailable(),
      }
    };
  }

  /**
   * Check cache health
   */
  async checkHealth(): Promise<{
    memory: { healthy: boolean };
    redis: { healthy: boolean; status: string; latency?: number; error?: string };
  }> {
    const redisHealth = await checkRedisHealth();

    return {
      memory: {
        healthy: true, // NodeCache is always available
      },
      redis: redisHealth,
    };
  }

  /**
   * Warm cache with data
   */
  async warmCache<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, entry.options)
    );
    
    await Promise.all(promises);
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      this.memoryCache.close();
      logInfo('Memory cache closed');
    } catch (error) {
      logWarn('Failed to close memory cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    if (isRedisAvailable()) {
      try {
        await this.redis.quit();
        logInfo('Redis connection closed');
      } catch (error) {
        logError('Failed to close Redis connection', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Utility functions for common cache patterns
export const cacheUtils = {
  /**
   * Generate cache key for user-specific data
   */
  userKey: (userId: string, resource: string) => `user:${userId}:${resource}`,

  /**
   * Generate cache key for product data
   */
  productKey: (productId: string) => `product:${productId}`,

  /**
   * Generate cache key for search results
   */
  searchKey: (query: string, filters: Record<string, any>) => {
    const filterStr = JSON.stringify(filters);
    return `search:${Buffer.from(query + filterStr).toString('base64')}`;
  },

  /**
   * Generate cache key for analytics data
   */
  analyticsKey: (type: string, period: string, userId?: string) => {
    const base = `analytics:${type}:${period}`;
    return userId ? `${base}:${userId}` : base;
  },

  /**
   * Generate cache key for API responses
   */
  apiKey: (endpoint: string, params: Record<string, any> = {}) => {
    const paramStr = Object.keys(params).length > 0 
      ? `:${Buffer.from(JSON.stringify(params)).toString('base64')}`
      : '';
    return `api:${endpoint}${paramStr}`;
  }
};

// Cache middleware for API routes
export function withCache<T>(
  key: string | ((req: any) => string),
  options: CacheOptions = {}
) {
  return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0];
      const cacheKey = typeof key === 'function' ? key(req) : key;

      try {
        return await cacheService.get<T>(
          cacheKey,
          () => method.apply(this, args),
          options
        );
      } catch (error) {
        logError('Cache middleware error', error instanceof Error ? error : new Error(String(error)), { cacheKey });
        return method.apply(this, args);
      }
    };

    return descriptor;
  };
}