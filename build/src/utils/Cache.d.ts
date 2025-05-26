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
export declare class Cache<T = any> {
    private cache;
    private accessOrder;
    private stats;
    private cleanupTimer?;
    private readonly options;
    constructor(options?: CacheOptions);
    /**
     * Get value from cache
     */
    get(key: string): T | undefined;
    /**
     * Set value in cache
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete entry from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Get all keys
     */
    keys(): string[];
    /**
     * Get cache size
     */
    get size(): number;
    /**
     * Destroy cache and cleanup
     */
    destroy(): void;
    /**
     * Check if entry is expired
     */
    private isExpired;
    /**
     * Update access order for LRU
     */
    private updateAccessOrder;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Start cleanup timer for expired entries
     */
    private startCleanupTimer;
    /**
     * Clean up expired entries
     */
    private cleanupExpired;
}
/**
 * Async cache wrapper for caching promise results
 */
export declare class AsyncCache<T = any> {
    private cache;
    private pending;
    constructor(options?: CacheOptions);
    /**
     * Get or compute value
     */
    get(key: string, compute: () => Promise<T>, ttl?: number): Promise<T>;
    /**
     * Invalidate cache entry
     */
    invalidate(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get cache stats
     */
    getStats(): CacheStats;
    /**
     * Destroy cache
     */
    destroy(): void;
}
/**
 * Decorator for caching method results
 */
export declare function memoize<T extends (...args: any[]) => any>(options?: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
}): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=Cache.d.ts.map