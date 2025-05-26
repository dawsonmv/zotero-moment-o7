export interface RobustLinkData {
    originalUrl: string;
    archiveUrls: Record<string, string>;
    versionDate?: string;
    title?: string;
}
export declare class RobustLinkCreator {
    private static readonly DEFAULT_TEMPLATE;
    /**
     * Creates a robust link HTML snippet with multiple archive sources
     */
    static create(data: RobustLinkData): string;
    /**
     * Creates a simple robust link for notes
     */
    static createSimple(originalUrl: string, archiveUrl: string, service?: string): string;
    /**
     * Parses robust link data from an HTML element
     */
    static parse(html: string): RobustLinkData | null;
    private static getPrimaryArchiveUrl;
    private static createArchiveLinks;
    private static detectService;
    private static escapeHtml;
}
//# sourceMappingURL=RobustLinkCreator.d.ts.map