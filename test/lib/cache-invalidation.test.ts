import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from '../../lib/redis';
import Redis from 'ioredis';
import NodeCache from 'node-cache';

// Mock Redis and NodeCache
vi.mock('ioredis');
vi.mock('node-cache');

describe('Cache Invalidation and Expiration', () => {
  let cacheService: CacheService;
  let mockRedis: any;
  let mockMemoryCache: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      quit: vi.fn().mockResolvedValue('OK'),
      on: vi.fn(),
      status: 'ready'
    };

    mockMemoryCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      flushAll: vi.fn(),
      close: vi.fn(),
      keys: vi.fn().mockReturnValue([]),
      getStats: vi.fn().mockReturnValue({
        keys: 0,
        hits: 0,
        misses: 0,
        ksize: 0,
        vsize: 0
      })
    };

    cacheService = new CacheService(mockRedis as any, mockMemoryCache as any);
  });

  afterEach(async () => {
    await cacheService.close();
  });

  describe('TTL and Expiration', () => {
    it('should set correct TTL for memory cache', async () => {
      const testValue = { id: 1, name: 'test' };
      const customTTL = 600; // 10 minutes

      await cacheService.set('test-key', testValue, { memoryTTL: customTTL });

      expect(mockMemoryCache.set).toHaveBeenCalledWith('test-key', testValue, customTTL);
    });

    it('should set correct TTL for Redis cache', async () => {
      const testValue = { id: 1, name: 'test' };
      const customTTL = 7200; // 2 hours

      mockRedis.setex.mockResolvedValue('OK');
      await cacheService.set('test-key', testValue, { redisTTL: customTTL });

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', customTTL, JSON.stringify(testValue));
    });

    it('should use default TTL when not specified', async () => {
      const testValue = { id: 1, name: 'test' };

      mockRedis.setex.mockResolvedValue('OK');
      await cacheService.set('test-key', testValue);

      expect(mockMemoryCache.set).toHaveBeenCalledWith('test-key', testValue, 300); // Default 5 minutes
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(testValue)); // Default 1 hour
    });

    it('should handle expired memory cache entries', async () => {
      // Simulate expired memory cache entry
      mockMemoryCache.get.mockReturnValue(undefined);
      
      const testValue = { id: 1, name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testValue));

      const fetchFunction = vi.fn();
      const result = await cacheService.get('expired-key', fetchFunction);

      expect(result).toEqual(testValue);
      expect(mockRedis.get).toHaveBeenCalledWith('expired-key');
      // Should repopulate memory cache
      expect(mockMemoryCache.set).toHaveBeenCalledWith('expired-key', testValue, 300);
    });
  });

  describe('Pattern-based Invalidation', () => {
    it('should invalidate user-specific cache entries', async () => {
      const userKeys = ['user:123:profile', 'user:123:preferences', 'user:123:orders'];
      mockRedis.keys.mockResolvedValue(userKeys);
      mockRedis.del.mockResolvedValue(userKeys.length);

      await cacheService.invalidate('user:123:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('user:123:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...userKeys);
      expect(mockMemoryCache.flushAll).toHaveBeenCalled();
    });

    it('should invalidate product category cache entries', async () => {
      const categoryKeys = ['product:category:vegetables', 'product:category:fruits'];
      mockRedis.keys.mockResolvedValue(categoryKeys);
      mockRedis.del.mockResolvedValue(categoryKeys.length);

      await cacheService.invalidate('product:category:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('product:category:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...categoryKeys);
    });

    it('should invalidate search cache entries', async () => {
      const searchKeys = ['search:organic', 'search:vegetables', 'search:local'];
      mockRedis.keys.mockResolvedValue(searchKeys);
      mockRedis.del.mockResolvedValue(searchKeys.length);

      await cacheService.invalidate('search:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('search:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...searchKeys);
    });

    it('should handle wildcard patterns correctly', async () => {
      const analyticsKeys = [
        'analytics:sales:daily:2024-01-01',
        'analytics:sales:daily:2024-01-02',
        'analytics:orders:daily:2024-01-01'
      ];
      mockRedis.keys.mockResolvedValue(analyticsKeys);
      mockRedis.del.mockResolvedValue(analyticsKeys.length);

      await cacheService.invalidate('analytics:*:daily:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:*:daily:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...analyticsKeys);
    });
  });

  describe('Hierarchical Cache Invalidation', () => {
    it('should invalidate memory cache when Redis invalidation fails', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis connection failed'));

      await cacheService.invalidate('user:*');

      // Should still clear memory cache even if Redis fails
      expect(mockMemoryCache.flushAll).toHaveBeenCalled();
    });

    it('should handle partial Redis invalidation failures', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockRejectedValue(new Error('Redis delete failed'));

      await expect(cacheService.invalidate('test:*')).resolves.not.toThrow();
      expect(mockMemoryCache.flushAll).toHaveBeenCalled();
    });
  });

  describe('Cache Warming and Preloading', () => {
    it('should warm cache with hierarchical data', async () => {
      const warmingData = [
        { key: 'user:123:profile', value: { id: 123, name: 'John' } },
        { key: 'user:123:preferences', value: { theme: 'dark', lang: 'en' } },
        { key: 'product:456', value: { id: 456, name: 'Organic Tomatoes' } }
      ];

      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.warmCache(warmingData);

      expect(mockMemoryCache.set).toHaveBeenCalledTimes(3);
      expect(mockRedis.setex).toHaveBeenCalledTimes(3);

      // Verify each entry was cached
      warmingData.forEach(entry => {
        expect(mockMemoryCache.set).toHaveBeenCalledWith(entry.key, entry.value, 300);
        expect(mockRedis.setex).toHaveBeenCalledWith(entry.key, 3600, JSON.stringify(entry.value));
      });
    });

    it('should handle warming failures gracefully', async () => {
      const warmingData = [
        { key: 'key1', value: { id: 1 } },
        { key: 'key2', value: { id: 2 } }
      ];

      // Simulate Redis failure for one key
      mockRedis.setex
        .mockResolvedValueOnce('OK')
        .mockRejectedValueOnce(new Error('Redis error'));

      await expect(cacheService.warmCache(warmingData)).resolves.not.toThrow();

      // Memory cache should still be populated
      expect(mockMemoryCache.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Fallback Behavior', () => {
    it('should fallback through cache hierarchy correctly', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // Memory cache miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // Redis cache miss
      mockRedis.get.mockResolvedValue(null);
      
      // Fetch function success
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      const result = await cacheService.get('test-key', fetchFunction);

      expect(result).toEqual(testValue);
      
      // Verify fallback order
      expect(mockMemoryCache.get).toHaveBeenCalledWith('test-key');
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(fetchFunction).toHaveBeenCalled();
      
      // Verify caching after fetch
      expect(mockMemoryCache.set).toHaveBeenCalledWith('test-key', testValue, 300);
      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(testValue));
    });

    it('should skip levels based on options', async () => {
      const testValue = { id: 1, name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testValue));

      const fetchFunction = vi.fn();
      const result = await cacheService.get('test-key', fetchFunction, {
        skipMemory: true
      });

      expect(result).toEqual(testValue);
      expect(mockMemoryCache.get).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should handle corrupted Redis data gracefully', async () => {
      const testValue = { id: 1, name: 'test' };
      
      mockMemoryCache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue('invalid-json-data');
      
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      // Should fallback to fetch function when JSON parsing fails
      const result = await cacheService.get('test-key', fetchFunction);

      expect(result).toEqual(testValue);
      expect(fetchFunction).toHaveBeenCalled();
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    it('should provide accurate cache statistics', () => {
      const mockStats = {
        keys: 5,
        hits: 100,
        misses: 20,
        ksize: 1024,
        vsize: 2048
      };
      
      mockMemoryCache.keys.mockReturnValue(['key1', 'key2', 'key3']);
      mockMemoryCache.getStats.mockReturnValue(mockStats);

      const stats = cacheService.getStats();

      expect(stats.memory.keys).toBe(3);
      expect(stats.memory.stats).toEqual(mockStats);
      expect(stats.redis.status).toBe('ready');
    });

    it('should track cache performance metrics', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // Simulate cache hit
      mockMemoryCache.get.mockReturnValue(testValue);
      
      const fetchFunction = vi.fn();
      await cacheService.get('test-key', fetchFunction);

      // Verify cache hit was recorded (fetch function not called)
      expect(fetchFunction).not.toHaveBeenCalled();
    });
  });
});