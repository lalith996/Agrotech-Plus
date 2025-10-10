// Performance optimization and caching utilities
import React from 'react';
import { cacheService, cacheUtils, CacheOptions as RedisCacheOptions } from './redis';

interface CacheOptions {
  ttl?: number // Time to live in seconds
  maxSize?: number // Maximum number of items in cache
  serialize?: boolean // Whether to serialize complex objects
}

// Re-export Redis cache options
export type { RedisCacheOptions };

interface CacheItem<T> {
  value: T
  expires: number
  size: number
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>()
  private readonly maxSize: number
  private readonly defaultTTL: number
  private currentSize = 0

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
    this.defaultTTL = (options.ttl || 300) * 1000 // Convert to milliseconds
  }

  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl ? ttl * 1000 : this.defaultTTL)
    const size = this.calculateSize(value)
    
    // Remove existing item if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!
      this.currentSize -= existing.size
    }
    
    // Evict items if cache is full
    while (this.cache.size >= this.maxSize && this.cache.size > 0) {
      this.evictOldest()
    }
    
    this.cache.set(key, { value, expires, size })
    this.currentSize += size
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    if (Date.now() > item.expires) {
      this.delete(key)
      return null
    }
    
    return item.value
  }

  delete(key: string): boolean {
    const item = this.cache.get(key)
    if (item) {
      this.currentSize -= item.size
      return this.cache.delete(key)
    }
    return false
  }

  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expires) {
      this.delete(key)
      return false
    }
    
    return true
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  // Clean up expired items
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now > item.expires) {
        this.delete(key)
        cleaned++
      }
    }
    
    return cleaned
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value
    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length
    } catch {
      return 1 // Fallback for non-serializable objects
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      currentSize: this.currentSize,
      hitRate: 0 // Would need to track hits/misses for this
    }
  }
}

// Global cache instances
export const apiCache = new MemoryCache({ ttl: 300, maxSize: 500 }) // 5 minutes
export const queryCache = new MemoryCache({ ttl: 60, maxSize: 1000 }) // 1 minute
export const staticCache = new MemoryCache({ ttl: 3600, maxSize: 100 }) // 1 hour

// Cache key generators
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  products: (filters?: string) => `products${filters ? `:${filters}` : ''}`,
  product: (id: string) => `product:${id}`,
  farmers: (filters?: string) => `farmers${filters ? `:${filters}` : ''}`,
  farmer: (id: string) => `farmer:${id}`,
  orders: (userId: string, filters?: string) => `orders:${userId}${filters ? `:${filters}` : ''}`,
  order: (id: string) => `order:${id}`,
  subscriptions: (userId: string) => `subscriptions:${userId}`,
  subscription: (id: string) => `subscription:${id}`,
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
  qcResults: (filters?: string) => `qc:results${filters ? `:${filters}` : ''}`,
  deliveryZones: () => 'delivery:zones',
  routes: (date: string) => `routes:${date}`
}

// Cache middleware for API routes
export function withCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; cache?: MemoryCache } = {}
): Promise<T> {
  const cache = options.cache || apiCache
  const cached = cache.get(cacheKey)
  
  if (cached) {
    return Promise.resolve(cached)
  }
  
  return fetcher().then(result => {
    cache.set(cacheKey, result, options.ttl)
    return result
  })
}

// Debounced function utility for search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttled function utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = func(...args)
    cache.set(key, result)
    return result
  }) as T
}

// Image optimization utilities
export const ImageOptimization = {
  // Generate optimized image URLs for Next.js Image component
  getOptimizedUrl(src: string, width: number, quality: number = 75): string {
    if (src.startsWith('http')) {
      // External image - use Next.js image optimization
      return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
    }
    return src // Local images handled by Next.js automatically
  },

  // Generate responsive image sizes
  getResponsiveSizes(): string {
    return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  },

  // Generate srcSet for responsive images
  generateSrcSet(src: string, sizes: number[] = [640, 768, 1024, 1280]): string {
    return sizes
      .map(size => `${this.getOptimizedUrl(src, size)} ${size}w`)
      .join(', ')
  }
}

// Database query optimization utilities
export const QueryOptimization = {
  // Generate efficient Prisma select objects
  selectFields<T>(fields: (keyof T)[]): Record<string, boolean> {
    return fields.reduce((acc, field) => {
      acc[field as string] = true
      return acc
    }, {} as Record<string, boolean>)
  },

  // Generate pagination parameters
  getPagination(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit
    return { skip, take: limit }
  },

  // Generate search where clause
  generateSearchWhere(query: string, fields: string[]) {
    if (!query.trim()) return {}
    
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: query,
          mode: 'insensitive' as const
        }
      }))
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static startTimer(label: string): () => number {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(label, duration)
      return duration
    }
  }

  static recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    
    const values = this.metrics.get(label)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  static getMetrics(label: string) {
    const values = this.metrics.get(label) || []
    if (values.length === 0) return null
    
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    return { avg, min, max, count: values.length }
  }

  static getAllMetrics() {
    const result: Record<string, any> = {}
    
    for (const [label] of Array.from(this.metrics.entries())) {
      result[label] = this.getMetrics(label)
    }
    
    return result
  }

  static clearMetrics(): void {
    this.metrics.clear()
  }
}

// Lazy loading utility for components
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFunc)
  
  return (props: React.ComponentProps<T>) => 
    React.createElement(React.Suspense, {
      fallback: fallback ? React.createElement(fallback) : React.createElement('div', {}, 'Loading...')
    }, React.createElement(LazyComponent, props))
}

// Bundle size optimization - code splitting utilities
export const CodeSplitting = {
  // Dynamically import heavy libraries
  async loadChartLibrary() {
    const dynamic = (await import('next/dynamic')).default
    return dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })
  },

  async loadDateLibrary() {
    return await import('date-fns')
  },

  async loadValidationLibrary() {
    return await import('zod')
  }
}

// Cleanup function to run periodically
export function setupCacheCleanup(): void {
  // Clean up expired cache items every 5 minutes
  setInterval(() => {
    apiCache.cleanup()
    queryCache.cleanup()
    staticCache.cleanup()
  }, 5 * 60 * 1000)
}

// Initialize cache cleanup when module loads
if (typeof window === 'undefined') {
  // Only run on server side
  setupCacheCleanup()
}

// Enhanced cache with Redis integration
export class EnhancedCache {
  private fallbackCache = apiCache;

  async get<T>(
    key: string,
    fetchFunction?: () => Promise<T>,
    options?: RedisCacheOptions
  ): Promise<T | null> {
    try {
      if (fetchFunction) {
        return await cacheService.get(key, fetchFunction, options);
      } else {
        // Try Redis first, then fallback
        const redisResult = await cacheService.get(
          key,
          async () => {
            const fallbackResult = this.fallbackCache.get(key) as T;
            if (fallbackResult !== null) {
              return fallbackResult;
            }
            throw new Error('No data found');
          },
          { ...options, skipMemory: true }
        );
        return redisResult;
      }
    } catch (error) {
      // Fallback to simple cache
      return this.fallbackCache.get(key) as T;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    try {
      await cacheService.set(key, data, {
        memoryTTL: ttlSeconds,
        redisTTL: ttlSeconds
      });
    } catch (error) {
      // Fallback to simple cache
      this.fallbackCache.set(key, data, ttlSeconds);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await cacheService.delete(key);
    } catch (error) {
      // Redis delete failed, using fallback
    }
    this.fallbackCache.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      await cacheService.invalidate(pattern);
    } catch (error) {
      // Redis invalidate failed, clearing fallback
    }
    this.fallbackCache.clear();
  }

  // Synchronous methods for backward compatibility
  getSync<T>(key: string): T | null {
    return this.fallbackCache.get(key) as T;
  }

  setSync(key: string, data: any, ttlSeconds: number = 300): void {
    this.fallbackCache.set(key, data, ttlSeconds);
    // Async set to Redis (fire and forget)
    this.set(key, data, ttlSeconds).catch(() => {});
  }

  deleteSync(key: string): void {
    this.fallbackCache.delete(key);
    // Async delete from Redis (fire and forget)
    this.delete(key).catch(() => {});
  }

  clear(): void {
    this.fallbackCache.clear();
    // Async clear Redis (fire and forget)
    this.invalidate('*').catch(() => {});
  }

  cleanup(): void {
    this.fallbackCache.cleanup();
  }
}

// Create enhanced cache instance
export const enhancedCache = new EnhancedCache();

// Cache helper functions for common patterns
export const cacheHelpers = {
  /**
   * Cache API response with automatic key generation
   */
  async cacheApiResponse<T>(
    endpoint: string,
    params: Record<string, any>,
    fetchFunction: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    const key = cacheUtils.apiKey(endpoint, params);
    const result = await enhancedCache.get(key, fetchFunction, { memoryTTL: ttl, redisTTL: ttl * 2 });
    return result || await fetchFunction();
  },

  /**
   * Cache user-specific data
   */
  async cacheUserData<T>(
    userId: string,
    resource: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 600
  ): Promise<T> {
    const key = cacheUtils.userKey(userId, resource);
    const result = await enhancedCache.get(key, fetchFunction, { memoryTTL: ttl, redisTTL: ttl * 2 });
    return result || await fetchFunction();
  },

  /**
   * Cache search results
   */
  async cacheSearchResults<T>(
    query: string,
    filters: Record<string, any>,
    fetchFunction: () => Promise<T>,
    ttl: number = 180
  ): Promise<T> {
    const key = cacheUtils.searchKey(query, filters);
    const result = await enhancedCache.get(key, fetchFunction, { memoryTTL: ttl, redisTTL: ttl * 3 });
    return result || await fetchFunction();
  },

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await enhancedCache.invalidate(`user:${userId}:*`);
  },

  /**
   * Invalidate product cache
   */
  async invalidateProductCache(productId?: string): Promise<void> {
    const pattern = productId ? `product:${productId}` : 'product:*';
    await enhancedCache.invalidate(pattern);
  },

  /**
   * Warm cache with frequently accessed data
   */
  async warmFrequentData(): Promise<void> {
    try {
      // This would be called during app startup
      const warmupData: any[] = [
        // Add frequently accessed data here
      ];
      
      await cacheService.warmCache(warmupData);
    } catch (error) {
      // Cache warmup failed
    }
  }
};

// Export Redis utilities
export { cacheService, cacheUtils };

export default {
  MemoryCache,
  apiCache,
  queryCache,
  staticCache,
  enhancedCache,
  CacheKeys,
  withCache,
  debounce,
  throttle,
  memoize,
  ImageOptimization,
  QueryOptimization,
  PerformanceMonitor,
  CodeSplitting,
  cacheHelpers,
  cacheService,
  cacheUtils
}