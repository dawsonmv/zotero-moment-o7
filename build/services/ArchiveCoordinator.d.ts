/**
 * Coordinates archiving across multiple services
 */
import { ArchiveResult } from './types';
export declare class ArchiveCoordinator {
    private static instance;
    private registry;
    private constructor();
    static getInstance(): ArchiveCoordinator;
    /**
     * Archive items with a specific service or using fallback logic
     */
    archiveItems(items: Zotero.Item[], serviceId?: string): Promise<ArchiveResult[]>;
    /**
     * Archive a single item
     */
    private archiveItem;
    /**
     * Archive with a specific service
     */
    private archiveWithService;
    /**
     * Archive using fallback order from preferences
     */
    private archiveWithFallback;
    /**
     * Auto-archive an item using the default service
     */
    autoArchive(item: Zotero.Item): Promise<ArchiveResult | null>;
    /**
     * Check if URL should be auto-archived
     */
    private shouldAutoArchive;
    /**
     * Get fallback order from preferences
     */
    private getFallbackOrder;
    /**
     * Order services according to fallback preferences
     */
    private orderServices;
}
//# sourceMappingURL=ArchiveCoordinator.d.ts.map