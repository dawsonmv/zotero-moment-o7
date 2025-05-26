/**
 * Zotero Web API v3 Client
 * For future cloud sync and external integration features
 */
import { ZoteroWebAPI } from '../types/zotero-web-api';
export declare class WebAPIClient implements ZoteroWebAPI.APIClient {
    private config;
    private baseUrl;
    private apiVersion;
    constructor(config: ZoteroWebAPI.ClientConfig);
    /**
     * Get API headers
     */
    private getHeaders;
    /**
     * Make API request
     */
    private request;
    /**
     * Get a single item
     */
    getItem(libraryType: string, libraryId: number, itemKey: string): Promise<ZoteroWebAPI.ItemResponse>;
    /**
     * Get multiple items
     */
    getItems(libraryType: string, libraryId: number, params?: ZoteroWebAPI.SearchParams): Promise<ZoteroWebAPI.ItemResponse[]>;
    /**
     * Create item
     */
    createItem(libraryType: string, libraryId: number, item: Partial<ZoteroWebAPI.ItemData>): Promise<ZoteroWebAPI.WriteResponse>;
    /**
     * Update item
     */
    updateItem(libraryType: string, libraryId: number, itemKey: string, item: Partial<ZoteroWebAPI.ItemData>, version: number): Promise<ZoteroWebAPI.WriteResponse>;
    /**
     * Delete item
     */
    deleteItem(libraryType: string, libraryId: number, itemKey: string, version: number): Promise<void>;
    /**
     * Sync archive data to the cloud
     * This would store archive metadata in item relations or notes
     */
    syncArchiveData(libraryType: string, libraryId: number, archives: ZoteroWebAPI.ArchiveData[]): Promise<ZoteroWebAPI.WriteResponse>;
    /**
     * Get archive data from the cloud
     */
    getArchiveData(libraryType: string, libraryId: number, itemKey: string): Promise<ZoteroWebAPI.ArchiveData[]>;
}
//# sourceMappingURL=WebAPIClient.d.ts.map