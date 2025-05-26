/**
 * Zotero Web API v3 Client
 * For future cloud sync and external integration features
 */

import { ZoteroWebAPI } from '../types/zotero-web-api';

export class WebAPIClient implements ZoteroWebAPI.APIClient {
  private baseUrl = 'https://api.zotero.org';
  private apiVersion = 3;
  
  constructor(private config: ZoteroWebAPI.ClientConfig) {}

  /**
   * Get API headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Zotero-API-Version': String(this.config.apiVersion || this.apiVersion)
    };

    if (this.config.apiKey) {
      headers['Zotero-API-Key'] = this.config.apiKey;
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: any;
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await Zotero.HTTP.request(method, url.toString(), {
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
        'Content-Type': 'application/json'
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      responseType: 'json'
    });

    if (response.status >= 400) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return JSON.parse(response.responseText);
  }

  /**
   * Get a single item
   */
  async getItem(
    libraryType: string, 
    libraryId: number, 
    itemKey: string
  ): Promise<ZoteroWebAPI.ItemResponse> {
    return this.request<ZoteroWebAPI.ItemResponse>(
      'GET',
      `/${libraryType}/${libraryId}/items/${itemKey}`
    );
  }

  /**
   * Get multiple items
   */
  async getItems(
    libraryType: string,
    libraryId: number,
    params?: ZoteroWebAPI.SearchParams
  ): Promise<ZoteroWebAPI.ItemResponse[]> {
    return this.request<ZoteroWebAPI.ItemResponse[]>(
      'GET',
      `/${libraryType}/${libraryId}/items`,
      { params: params as any }
    );
  }

  /**
   * Create item
   */
  async createItem(
    libraryType: string,
    libraryId: number,
    item: Partial<ZoteroWebAPI.ItemData>
  ): Promise<ZoteroWebAPI.WriteResponse> {
    return this.request<ZoteroWebAPI.WriteResponse>(
      'POST',
      `/${libraryType}/${libraryId}/items`,
      { body: [item] }
    );
  }

  /**
   * Update item
   */
  async updateItem(
    libraryType: string,
    libraryId: number,
    itemKey: string,
    item: Partial<ZoteroWebAPI.ItemData>,
    version: number
  ): Promise<ZoteroWebAPI.WriteResponse> {
    return this.request<ZoteroWebAPI.WriteResponse>(
      'PATCH',
      `/${libraryType}/${libraryId}/items/${itemKey}`,
      {
        body: item,
        headers: { 'If-Unmodified-Since-Version': String(version) }
      }
    );
  }

  /**
   * Delete item
   */
  async deleteItem(
    libraryType: string,
    libraryId: number,
    itemKey: string,
    version: number
  ): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/${libraryType}/${libraryId}/items/${itemKey}`,
      {
        headers: { 'If-Unmodified-Since-Version': String(version) }
      }
    );
  }

  /**
   * Sync archive data to the cloud
   * This would store archive metadata in item relations or notes
   */
  async syncArchiveData(
    _libraryType: string,
    _libraryId: number,
    _archives: ZoteroWebAPI.ArchiveData[]
  ): Promise<ZoteroWebAPI.WriteResponse> {
    // Implementation would create/update items with archive data
    // For now, this is a placeholder for future implementation
    throw new Error('Not implemented yet');
  }

  /**
   * Get archive data from the cloud
   */
  async getArchiveData(
    _libraryType: string,
    _libraryId: number,
    _itemKey: string
  ): Promise<ZoteroWebAPI.ArchiveData[]> {
    // Implementation would extract archive data from item relations or notes
    // For now, this is a placeholder for future implementation
    throw new Error('Not implemented yet');
  }
}