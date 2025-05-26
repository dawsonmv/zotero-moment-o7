/**
 * Handles Zotero item operations
 * Separates Zotero-specific concerns from archiving logic
 */
export interface ItemMetadata {
    url: string;
    title: string;
    doi?: string;
    tags: string[];
    hasArchiveTag: boolean;
}
/**
 * Handles all Zotero item operations
 * Single responsibility: Zotero item manipulation
 */
export declare class ZoteroItemHandler {
    private static readonly ARCHIVE_TAG;
    /**
     * Extract metadata from Zotero item
     */
    static extractMetadata(item: Zotero.Item): ItemMetadata;
    /**
     * Save archive information to item
     */
    static saveArchiveToItem(item: Zotero.Item, archiveUrl: string, serviceName: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Update Extra field with archive information
     */
    private static updateExtraField;
    /**
     * Create archive note with robust link
     */
    private static createArchiveNote;
    /**
     * Generate note content
     */
    private static generateNoteContent;
    /**
     * Check if item has a specific tag
     */
    private static hasTag;
    /**
     * Find existing archive URLs in item
     */
    static findExistingArchives(item: Zotero.Item): Map<string, string>;
    /**
     * Get notes for an item
     */
    private static getItemNotes;
    /**
     * Extract archive links from note content
     */
    private static extractArchiveLinksFromNote;
    /**
     * Detect service from URL
     */
    private static detectServiceFromUrl;
    /**
     * Check if item needs archiving
     */
    static needsArchiving(item: Zotero.Item): boolean;
}
//# sourceMappingURL=ZoteroItemHandler.d.ts.map