/**
 * Base class for all archive services
 */
import { ArchiveService, ServiceConfig, ArchiveResult, ArchiveError, ProgressWindow, SingleArchiveResult, ArchiveProgress } from './types';
export declare abstract class BaseArchiveService implements ArchiveService {
    protected config: ServiceConfig;
    protected lastRequest: number | null;
    constructor(config: ServiceConfig);
    get name(): string;
    get id(): string;
    abstract isAvailable(): Promise<boolean>;
    /**
     * Archive a single URL - to be implemented by subclasses
     */
    protected abstract archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult>;
    /**
     * Archive multiple items
     */
    archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;
    /**
     * Check if URL is valid for archiving
     */
    checkValidUrl(url: string): boolean;
    /**
     * Get the best URL for archiving (prefer DOI if available)
     */
    getBestUrl(item: Zotero.Item): string;
    /**
     * Make HTTP request with error handling
     */
    protected makeHttpRequest(url: string, options: Zotero.HTTPRequestOptions): Promise<{
        success: boolean;
        data: any;
        error?: string;
        status?: number;
    }>;
    /**
     * Check rate limiting
     */
    protected checkRateLimit(): Promise<void>;
    /**
     * Update last request timestamp
     */
    protected updateLastRequest(): void;
    /**
     * Create robust link HTML
     */
    protected createRobustLinkHTML(originalUrl: string, archivedUrl: string, linkText: string, useArchivedHref?: boolean): string;
    /**
     * Escape HTML for safe insertion
     */
    protected escapeHtml(text: string): string;
    /**
     * Save archive URL to item
     */
    protected saveToItem(item: Zotero.Item, archivedUrl: string, metadata?: {
        additionalInfo?: string;
    }): Promise<void>;
    /**
     * Create progress window wrapper
     */
    protected createProgressWindow(): ProgressWindow;
    /**
     * Map HTTP error to ArchiveError
     */
    protected mapHttpError(error: any): ArchiveError;
}
//# sourceMappingURL=BaseArchiveService.d.ts.map