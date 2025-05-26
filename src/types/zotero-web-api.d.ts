/**
 * Zotero Web API v3 Type Definitions
 * For future cloud sync and external integration features
 */

export namespace ZoteroWebAPI {
  // API Response Types
  interface APIResponse<T> {
    data: T;
    version: number;
    links?: {
      self?: string;
      alternate?: string;
      up?: string;
    };
  }

  interface CollectionResponse {
    key: string;
    version: number;
    library: LibraryIdentifier;
    data: {
      key: string;
      version: number;
      name: string;
      parentCollection?: string | false;
    };
  }

  interface ItemResponse {
    key: string;
    version: number;
    library: LibraryIdentifier;
    data: ItemData;
  }

  interface ItemData {
    key: string;
    version: number;
    itemType: string;
    title?: string;
    creators?: Creator[];
    abstractNote?: string;
    publicationTitle?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    date?: string;
    series?: string;
    seriesTitle?: string;
    seriesText?: string;
    journalAbbreviation?: string;
    language?: string;
    DOI?: string;
    ISSN?: string;
    shortTitle?: string;
    url?: string;
    accessDate?: string;
    archive?: string;
    archiveLocation?: string;
    libraryCatalog?: string;
    callNumber?: string;
    rights?: string;
    extra?: string;
    tags?: Tag[];
    collections?: string[];
    relations?: Record<string, string | string[]>;
    dateAdded?: string;
    dateModified?: string;
  }

  interface Creator {
    creatorType: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  }

  interface Tag {
    tag: string;
    type?: number;
  }

  interface LibraryIdentifier {
    type: 'user' | 'group';
    id: number;
    name?: string;
    links?: {
      alternate: {
        href: string;
        type: string;
      };
    };
  }

  // API Client Configuration
  interface ClientConfig {
    apiKey?: string;
    apiVersion?: number;
    locale?: string;
  }

  // Request Options
  interface RequestOptions {
    userOrGroupPrefix: string;
    params?: Record<string, string | number | boolean>;
    headers?: Record<string, string>;
  }

  // Search/Query Parameters
  interface SearchParams {
    q?: string;
    qmode?: 'titleCreatorYear' | 'everything';
    itemType?: string;
    tag?: string | string[];
    collection?: string;
    format?: 'json' | 'atom' | 'bib' | 'bibtex';
    include?: string;
    sort?: 'dateAdded' | 'dateModified' | 'title' | 'creator' | 'itemType' | 'date' | 'publisher' | 'publicationTitle' | 'journalAbbreviation' | 'language' | 'accessDate' | 'libraryCatalog' | 'callNumber' | 'rights' | 'addedBy' | 'numItems';
    direction?: 'asc' | 'desc';
    limit?: number;
    start?: number;
  }

  // Write Operations
  interface WriteResponse {
    successful: Record<string, ItemResponse | CollectionResponse>;
    unchanged: Record<string, true>;
    failed: Record<string, {
      code: number;
      message: string;
      data?: any;
    }>;
  }

  // Archive-specific extensions
  interface ArchiveData {
    url: string;
    archivedUrl: string;
    archiveService: string;
    archiveDate: string;
    archiveStatus: 'pending' | 'completed' | 'failed';
    archiveError?: string;
  }

  // Future API client interface
  interface APIClient {
    getItem(libraryType: string, libraryId: number, itemKey: string): Promise<ItemResponse>;
    getItems(libraryType: string, libraryId: number, params?: SearchParams): Promise<ItemResponse[]>;
    createItem(libraryType: string, libraryId: number, item: Partial<ItemData>): Promise<WriteResponse>;
    updateItem(libraryType: string, libraryId: number, itemKey: string, item: Partial<ItemData>, version: number): Promise<WriteResponse>;
    deleteItem(libraryType: string, libraryId: number, itemKey: string, version: number): Promise<void>;
    
    // Archive-specific methods
    syncArchiveData(libraryType: string, libraryId: number, archives: ArchiveData[]): Promise<WriteResponse>;
    getArchiveData(libraryType: string, libraryId: number, itemKey: string): Promise<ArchiveData[]>;
  }
}