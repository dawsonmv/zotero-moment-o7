/**
 * RFC 7089 Memento Protocol implementation
 * @see https://tools.ietf.org/html/rfc7089
 */
export interface MementoLink {
    url: string;
    rel: string[];
    datetime?: string;
    type?: string;
    from?: string;
    until?: string;
}
export interface TimeMap {
    original: string;
    timegate?: string;
    timemap?: string;
    mementos: Memento[];
}
export interface Memento {
    url: string;
    datetime: string;
    rel?: string[];
}
export interface TimeGateResponse {
    mementoUrl: string;
    mementoDatetime: string;
    original: string;
    links: MementoLink[];
}
export declare class MementoProtocol {
    private static readonly LINK_HEADER;
    private static readonly MEMENTO_DATETIME_HEADER;
    private static readonly ACCEPT_DATETIME_HEADER;
    /**
     * Parse Link header according to RFC 5988
     */
    static parseLinkHeader(header: string): MementoLink[];
    /**
     * Format Link header
     */
    static formatLinkHeader(links: MementoLink[]): string;
    /**
     * Parse TimeMap from JSON
     */
    static parseTimeMap(json: any): TimeMap;
    /**
     * Parse TimeMap from link format
     */
    static parseTimemapLinkFormat(text: string): TimeMap;
    /**
     * Find the best memento for a given datetime
     */
    static findBestMemento(mementos: Memento[], targetDate?: Date): Memento | null;
    /**
     * Format HTTP date
     */
    static formatHttpDate(date: Date): string;
    /**
     * Parse HTTP date
     */
    static parseHttpDate(dateStr: string): Date;
    /**
     * Check if a response is a memento
     */
    static isMemento(headers: Record<string, string>): boolean;
    /**
     * Extract memento information from response headers
     */
    static extractMementoInfo(headers: Record<string, string>): TimeGateResponse | null;
}
//# sourceMappingURL=MementoProtocol.d.ts.map