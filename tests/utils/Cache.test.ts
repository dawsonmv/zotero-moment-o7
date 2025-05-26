/**
 * Unit tests for Cache
 */

import { Cache, AsyncCache } from '../../src/utils/Cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({ 
      maxSize: 3, 
      defaultTTL: 1000,
      cleanupInterval: 10000 
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('missing')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('TTL behavior', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      cache.set('key1', 'value1');
      const entry = (cache as any).cache.get('key1');
      expect(entry.ttl).toBe(1000);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1 to make it more recent
      cache.get('key1');
      
      // Adding key4 should evict key2 (LRU)
      cache.set('key4', 'value4');
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update access order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access in different order
      cache.get('key2');
      cache.get('key1');
      cache.get('key3');
      
      // Add new item, should evict key2 (least recently used)
      cache.set('key4', 'value4');
      
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('missing'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 3);
    });

    it('should track evictions', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should trigger eviction
      
      const stats = cache.getStats();
      expect(stats.evictions).toBe(1);
    });
  });

  describe('callbacks', () => {
    it('should call onEvict callback', () => {
      const onEvict = jest.fn();
      const cacheWithCallback = new Cache({ maxSize: 2, onEvict });
      
      cacheWithCallback.set('key1', 'value1');
      cacheWithCallback.set('key2', 'value2');
      cacheWithCallback.set('key3', 'value3'); // Should evict key1
      
      expect(onEvict).toHaveBeenCalledWith('key1', 'value1');
      
      cacheWithCallback.destroy();
    });
  });
});

describe('AsyncCache', () => {
  let asyncCache: AsyncCache<string>;

  beforeEach(() => {
    asyncCache = new AsyncCache<string>({ maxSize: 3, defaultTTL: 1000 });
  });

  afterEach(() => {
    asyncCache.destroy();
  });

  it('should cache async computations', async () => {
    const compute = jest.fn().mockResolvedValue('computed value');
    
    const result1 = await asyncCache.get('key1', compute);
    const result2 = await asyncCache.get('key1', compute);
    
    expect(result1).toBe('computed value');
    expect(result2).toBe('computed value');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('should handle concurrent requests for same key', async () => {
    const compute = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'computed value';
    });
    
    const [result1, result2] = await Promise.all([
      asyncCache.get('key1', compute),
      asyncCache.get('key1', compute)
    ]);
    
    expect(result1).toBe('computed value');
    expect(result2).toBe('computed value');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('should not cache errors', async () => {
    const compute = jest.fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce('success');
    
    await expect(asyncCache.get('key1', compute)).rejects.toThrow('First error');
    
    const result = await asyncCache.get('key1', compute);
    expect(result).toBe('success');
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('should invalidate entries', async () => {
    const compute = jest.fn().mockResolvedValue('value');
    
    await asyncCache.get('key1', compute);
    asyncCache.invalidate('key1');
    await asyncCache.get('key1', compute);
    
    expect(compute).toHaveBeenCalledTimes(2);
  });
});