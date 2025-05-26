export interface MementoCheckResult {
    hasMemento: boolean;
    mementos: MementoInfo[];
    timegate?: string;
    timemap?: string;
}
export interface MementoInfo {
    url: string;
    datetime: string;
    service: string;
}
export declare class MementoChecker {
    private static readonly AGGREGATORS;
    private static readonly KNOWN_ARCHIVES;
    /**
     * Check for existing mementos of a URL
     */
    static checkUrl(url: string): Promise<MementoCheckResult>;
    /**
     * Check if a specific archive has a memento
     */
    static checkArchive(url: string, archiveName: string): Promise<MementoInfo | null>;
    /**
     * Fetch TimeMap from a URL
     */
    private static fetchTimeMap;
    /**
     * Extract memento information from TimeMap
     */
    private static extractMementoInfo;
    /**
     * Find existing mementos in item data
     */
    static findExistingMementos(item: Zotero.Item): MementoInfo[];
}
//# sourceMappingURL=MementoChecker.d.ts.map