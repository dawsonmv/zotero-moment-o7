/**
 * Refactored base class for archive services
 * Follows Single Responsibility Principle
 */
import { ArchiveService, ServiceConfig, ArchiveResult, SingleArchiveResult, ArchiveProgress } from './types';
import { HttpClient } from '../utils/HttpClient';
import { ProgressReporter } from '../utils/ProgressReporter';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { AsyncCache } from '../utils/Cache';
/**
 * Base implementation for archive services
 * Focused only on the core archiving logic
 */
export declare abstract class BaseArchiveService2 implements ArchiveService {
    protected config: ServiceConfig;
    protected httpClient: HttpClient;
    protected progressReporter: ProgressReporter;
    protected circuitBreaker: CircuitBreaker;
    protected cache: AsyncCache<SingleArchiveResult>;
    constructor(config: ServiceConfig);
    get name(): string;
    get id(): string;
    /**
     * Check if service is available
     */
    abstract isAvailable(): Promise<boolean>;
    /**
     * Archive a single URL - to be implemented by subclasses
     */
    protected abstract performArchive(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult>;
    /**
     * Archive multiple items with circuit breaker and caching
     */
    archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;
    /**
     * Check if URL is valid for archiving
     */
    checkValidUrl(url: string): boolean;
    /**
     * Extract URL from Zotero item
     * Prefers DOI URLs when available
     */
    protected extractUrl(item: Zotero.Item): string;
    /**
     * Generate cache key for URL
     */
    protected getCacheKey(url: string): string;
    /**
     * Subscribe to progress events
     */
    onProgress(listener: (event: any) => void): () => void;
    /**
     * Get service statistics
     */
    getStats(): {
        cache: import("../utils/Cache").CacheStats;
        circuitBreaker: import("../utils/CircuitBreaker").CircuitBreakerState;
    };
    /**
     * Clear service cache
     */
    clearCache(): void;
    /**
     * Reset circuit breaker
     */
    resetCircuit(): void;
}
//# sourceMappingURL=BaseArchiveService2.d.ts.map