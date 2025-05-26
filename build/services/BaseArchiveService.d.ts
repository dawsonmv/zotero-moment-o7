/**
 * Base class for all archive services
 */
import { ArchiveService, ServiceConfig, ArchiveResult, ArchiveError, ProgressWindow } from './types';
export declare abstract class BaseArchiveService implements ArchiveService {
    protected config: ServiceConfig;
    protected lastRequest: number | null;
    constructor(config: ServiceConfig);
    get name(): string;
    get id(): string;
    abstract isAvailable(): Promise<boolean>;
    abstract archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;
    /**
     * Check if URL is valid for archiving
     */
    checkValidUrl(url: string): boolean;
    /**
     * Get the best URL for archiving (prefer DOI if available)
     */
    getBestUrl(item: Zotero.Item): string;
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