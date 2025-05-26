/**
 * Signpost - Extracts ORCID and other scholarly identifiers using the Signposting protocol
 * @see https://signposting.org/
 */
export interface SignpostLink {
    href: string;
    rel: string;
    type?: string;
    profile?: string;
}
export interface AuthorInfo {
    orcid?: string;
    name?: string;
    uri?: string;
}
export declare class Signpost {
    private static readonly LINK_HEADER;
    private static readonly ORCID_PATTERN;
    /**
     * Extract author information from a webpage
     */
    static extractAuthors(url: string): Promise<AuthorInfo[]>;
    /**
     * Parse Signposting links from Link header
     */
    private static parseSignpostingLinks;
    /**
     * Parse Link header (simplified version)
     */
    private static parseLinkHeader;
    /**
     * Extract author information from HTML
     */
    private static extractFromHTML;
    /**
     * Extract author information from JSON-LD
     */
    private static extractFromJSONLD;
    /**
     * Add ORCID to Zotero item
     */
    static addORCIDToItem(item: Zotero.Item, url: string): Promise<boolean>;
    /**
     * Fuzzy match author names
     */
    private static fuzzyMatchNames;
}
//# sourceMappingURL=Signpost.d.ts.map