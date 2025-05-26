/**
 * HTML utility functions
 * Separates HTML processing concerns from business logic
 */
export declare class HtmlUtils {
    /**
     * Escape HTML special characters to prevent XSS
     */
    static escape(text: string): string;
    /**
     * Unescape HTML entities
     */
    static unescape(text: string): string;
    /**
     * Strip HTML tags from text
     */
    static stripTags(html: string): string;
    /**
     * Create a safe HTML element from text
     */
    static createSafeElement(tag: string, text: string, attributes?: Record<string, string>): string;
    /**
     * Create a robust link with data attributes
     */
    static createRobustLink(originalUrl: string, archivedUrl: string, linkText: string, versionDate?: string): string;
    /**
     * Parse attributes from an HTML string
     */
    static parseAttributes(html: string): Record<string, string>;
    /**
     * Extract URLs from HTML content
     */
    static extractUrls(html: string): string[];
    /**
     * Sanitize HTML to remove potentially dangerous elements
     */
    static sanitize(html: string, allowedTags?: string[]): string;
}
//# sourceMappingURL=HtmlUtils.d.ts.map