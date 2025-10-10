import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from '../../lib/redis';
import Redis from 'ioredis';
import NodeCache from 'node-cache';

// Mock Redis and NodeCache
vi.mock('ioredis');
vi.mock('node-cache');

describe('Hierarchical Cache Fallback', () => {
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

  describe('Three-Level Cache Hierarchy', () => {
    it('should follow L1 -> L2 -> L3 fallback pattern', async () => {
      const testValue = { id: 1, name: 'test', data: 'complex-object' };
      
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L2 (Redis) miss
      mockRedis.get.mockResolvedValue(null);
      
      // L3 (Source) hit
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      const result = await cacheService.get('hierarchy-test', fetchFunction);

      expect(result).toEqual(testValue);
      
      // Verify call order
      expect(mockMemoryCache.get).toHaveBeenCalledWith('hierarchy-test');
      expect(mockRedis.get).toHaveBeenCalledWith('hierarchy-test');
      expect(fetchFunction).toHaveBeenCalled();
      
      // Verify backfill to all levels
      expect(mockMemoryCache.set).toHaveBeenCalledWith('hierarchy-test', testValue, 300);
      expect(mockRedis.setex).toHaveBeenCalledWith('hierarchy-test', 3600, JSON.stringify(testValue));
    });

    it('should stop at L1 when cache hit occurs', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) hit
      mockMemoryCache.get.mockReturnValue(testValue);
      
      const fetchFunction = vi.fn();
      const result = await cacheService.get('l1-hit-test', fetchFunction);

      expect(result).toEqual(testValue);
      
      // Should not proceed to L2 or L3
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should stop at L2 when cache hit occurs', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L2 (Redis) hit
      mockRedis.get.mockResolvedValue(JSON.stringify(testValue));
      
      const fetchFunction = vi.fn();
      const result = await cacheService.get('l2-hit-test', fetchFunction);

      expect(result).toEqual(testValue);
      
      // Should not proceed to L3
      expect(fetchFunction).not.toHaveBeenCalled();
      
      // Should backfill L1
      expect(mockMemoryCache.set).toHaveBeenCalledWith('l2-hit-test', testValue, 300);
    });
  });

  describe('Cache Level Skipping', () => {
    it('should skip L1 when skipMemory is true', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L2 (Redis) hit
      mockRedis.get.mockResolvedValue(JSON.stringify(testValue));
      
      const fetchFunction = vi.fn();
      const result = await cacheService.get('skip-memory-test', fetchFunction, {
        skipMemory: true
      });

      expect(result).toEqual(testValue);
      
      // L1 should be skipped
      expect(mockMemoryCache.get).not.toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith('skip-memory-test');
      expect(fetchFunction).not.toHaveBeenCalled();
      
      // Should not backfill L1
      expect(mockMemoryCache.set).not.toHaveBeenCalled();
    });

    it('should skip L2 when skipRedis is true', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L3 (Source) hit
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      const result = await cacheService.get('skip-redis-test', fetchFunction, {
        skipRedis: true
      });

      expect(result).toEqual(testValue);
      
      // L2 should be skipped
      expect(mockMemoryCache.get).toHaveBeenCalledWith('skip-redis-test');
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(fetchFunction).toHaveBeenCalled();
      
      // Should backfill L1 but not L2
      expect(mockMemoryCache.set).toHaveBeenCalledWith('skip-redis-test', testValue, 300);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should skip both L1 and L2 when both skip options are true', async () => {
      const testValue = { id: 1, name: 'test' };
      
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      const result = await cacheService.get('skip-both-test', fetchFunction, {
        skipMemory: true,
        skipRedis: true
      });

      expect(result).toEqual(testValue);
      
      // Both L1 and L2 should be skipped
      expect(mockMemoryCache.get).not.toHaveBeenCalled();
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(fetchFunction).toHaveBeenCalled();
      
      // No backfilling should occur
      expect(mockMemoryCache.set).not.toHaveBeenCalled();
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling in Hierarchy', () => {
    it('should fallback to L2 when L1 throws error', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) error
      mockMemoryCache.get.mockImplementation(() => {
        throw new Error('Memory cache error');
      });
      
      // L2 (Redis) hit
      mockRedis.get.mockResolvedValue(JSON.stringify(testValue));
      
      const fetchFunction = vi.fn();
      const result = await cacheService.get('l1-error-test', fetchFunction);

      expect(result).toEqual(testValue);
      expect(mockRedis.get).toHaveBeenCalledWith('l1-error-test');
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should fallback to L3 when L2 throws error', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L2 (Redis) error
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      
      // L3 (Source) hit
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      const result = await cacheService.get('l2-error-test', fetchFunction);

      expect(result).toEqual(testValue);
      expect(fetchFunction).toHaveBeenCalled();
      
      // Should still try to backfill L1
      expect(mockMemoryCache.set).toHaveBeenCalledWith('l2-error-test', testValue, 300);
    });

    it('should handle JSON parsing errors in L2', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L2 (Redis) returns invalid JSON
      mockRedis.get.mockResolvedValue('invalid-json-{');
      
      // L3 (Source) hit
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      const result = await cacheService.get('json-error-test', fetchFunction);

      expect(result).toEqual(testValue);
      expect(fetchFunction).toHaveBeenCalled();
    });

    it('should propagate L3 errors when all cache levels fail', async () => {
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L2 (Redis) error
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      // L3 (Source) error
      const fetchFunction = vi.fn().mockRejectedValue(new Error('Source error'));
      
      await expect(cacheService.get('all-fail-test', fetchFunction))
        .rejects.toThrow('Source error');
    });
  });

  describe('Performance Optimization', () => {
    it('should not wait for backfill operations', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // L1 (Memory) miss
      mockMemoryCache.get.mockReturnValue(undefined);
      
      // L2 (Redis) miss
      mockRedis.get.mockResolvedValue(null);
      
      // L3 (Source) hit
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      // Slow Redis setex operation
      mockRedis.setex.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('OK'), 100))
      );
      
      const startTime = Date.now();
      const result = await cacheService.get('performance-test', fetchFunction);
      const endTime = Date.now();
      
      expect(result).toEqual(testValue);
      // Should not wait for Redis setex to complete
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle concurrent cache requests efficiently', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // All cache levels miss
      mockMemoryCache.get.mockReturnValue(undefined);
      mockRedis.get.mockResolvedValue(null);
      
      const fetchFunction = vi.fn().mockResolvedValue(testValue);
      
      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => 
        cacheService.get('concurrent-test', fetchFunction)
      );
      
      const results = await Promise.all(promises);
      
      // All should return the same value
      results.forEach(result => expect(result).toEqual(testValue));
      
      // Fetch function should be called multiple times (no request deduplication in this implementation)
      expect(fetchFunction).toHaveBeenCalledTimes(5);
    });
  });

  describe('Cache Coherence', () => {
    it('should maintain consistency across cache levels', async () => {
      const initialValue = { id: 1, name: 'initial' };
      const updatedValue = { id: 1, name: 'updated' };
      
      // Set initial value
      await cacheService.set('coherence-test', initialValue);
      
      // Update value
      await cacheService.set('coherence-test', updatedValue);
      
      // Both levels should have the updated value
      expect(mockMemoryCache.set).toHaveBeenLastCalledWith('coherence-test', updatedValue, 300);
      expect(mockRedis.setex).toHaveBeenLastCalledWith('coherence-test', 3600, JSON.stringify(updatedValue));
    });

    it('should handle cache invalidation across all levels', async () => {
      await cacheService.delete('invalidation-test');
      
      // Both levels should be invalidated
      expect(mockMemoryCache.del).toHaveBeenCalledWith('invalidation-test');
      expect(mockRedis.del).toHaveBeenCalledWith('invalidation-test');
    });

    it('should handle pattern-based invalidation correctly', async () => {
      const keys = ['user:123:profile', 'user:123:settings'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(keys.length);
      
      await cacheService.invalidate('user:123:*');
      
      // Memory cache should be flushed (simple strategy)
      expect(mockMemoryCache.flushAll).toHaveBeenCalled();
      
      // Redis should use pattern matching
      expect(mockRedis.keys).toHaveBeenCalledWith('user:123:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });
  });

  describe('TTL Handling Across Levels', () => {
    it('should use different TTLs for different cache levels', async () => {
      const testValue = { id: 1, name: 'test' };
      const memoryTTL = 300; // 5 minutes
      const redisTTL = 3600; // 1 hour
      
      await cacheService.set('ttl-test', testValue, {
        memoryTTL,
        redisTTL
      });
      
      expect(mockMemoryCache.set).toHaveBeenCalledWith('ttl-test', testValue, memoryTTL);
      expect(mockRedis.setex).toHaveBeenCalledWith('ttl-test', redisTTL, JSON.stringify(testValue));
    });

    it('should respect TTL hierarchy (shorter TTL for faster cache)', async () => {
      const testValue = { id: 1, name: 'test' };
      
      // Memory cache should typically have shorter TTL than Redis
      await cacheService.set('ttl-hierarchy-test', testValue, {
        memoryTTL: 300,  // 5 minutes
        redisTTL: 3600   // 1 hour
      });
      
      expect(mockMemoryCache.set).toHaveBeenCalledWith('ttl-hierarchy-test', testValue, 300);
      expect(mockRedis.setex).toHaveBeenCalledWith('ttl-hierarchy-test', 3600, JSON.stringify(testValue));
    });
  });
});