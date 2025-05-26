/**
 * Generic caching implementation with TTL support
 * Improves performance by avoiding redundant operations
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
  onEvict?: (key: string, value: any) => void;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

/**
 * LRU Cache with TTL support
 * Implements Least Recently Used eviction policy
 */
export class Cache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };
  
  private cleanupTimer?: number;
  private readonly options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      defaultTTL: options.defaultTTL ?? 3600000, // 1 hour
      cleanupInterval: options.cleanupInterval ?? 60000, // 1 minute
      onEvict: options.onEvict ?? (() => {})
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    
    // Update stats
    entry.hits++;
    this.stats.hits++;
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Check if we need to evict
    if (!this.cache.has(key) && this.cache.size >= this.options.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTTL,
      hits: 0
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.options.onEvict(key, entry.value);
    
    return true;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    for (const [key, entry] of this.cache) {
      this.options.onEvict(key, entry.value);
    }
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.clear();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
    this.stats.evictions++;
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.options.cleanupInterval) as any;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }
  }
}

/**
 * Async cache wrapper for caching promise results
 */
export class AsyncCache<T = any> {
  private cache: Cache<Promise<T>>;
  private pending = new Map<string, Promise<T>>();

  constructor(options?: CacheOptions) {
    this.cache = new Cache(options);
  }

  /**
   * Get or compute value
   */
  async get(
    key: string, 
    compute: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if already cached
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Check if computation is already in progress
    const pending = this.pending.get(key);
    if (pending) {
      return pending;
    }

    // Compute value
    const promise = compute().then(
      value => {
        this.pending.delete(key);
        return value;
      },
      error => {
        this.pending.delete(key);
        // Don't cache errors
        this.cache.delete(key);
        throw error;
      }
    );

    // Store promise immediately to prevent duplicate computations
    this.pending.set(key, promise);
    this.cache.set(key, promise, ttl);

    return promise;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): boolean {
    this.pending.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.pending.clear();
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Destroy cache
   */
  destroy(): void {
    this.pending.clear();
    this.cache.destroy();
  }
}

/**
 * Decorator for caching method results
 */
export function memoize<T extends (...args: any[]) => any>(
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
  } = {}
) {
  const cache = new Map<string, { value: ReturnType<T>; expires: number }>();
  
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const keyGen = options.keyGenerator ?? ((...args) => JSON.stringify(args));
    const ttl = options.ttl ?? 3600000;

    descriptor.value = function(...args: Parameters<T>): ReturnType<T> {
      const key = keyGen(...args);
      const now = Date.now();
      
      // Check cache
      const cached = cache.get(key);
      if (cached && cached.expires > now) {
        return cached.value;
      }

      // Call original method
      const result = originalMethod.apply(this, args);
      
      // Cache result
      cache.set(key, {
        value: result,
        expires: now + ttl
      });

      return result;
    };

    return descriptor;
  };
}