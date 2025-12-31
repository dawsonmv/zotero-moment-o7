/// <reference types="jest" />

declare namespace jest {
  interface Matchers<R> {
    toBeValidUrl(): R;
  }
}

// Zotero namespace for tests
declare namespace Zotero {
  interface Item {
    id?: number;
    itemType?: string;
    getField(field: string): string;
    setField(field: string, value: string): void;
    getTags(): Array<{ tag: string }>;
    addTag(tag: string): void;
    removeTag(tag: string): void;
    saveTx(): Promise<void>;
    save(): Promise<void>;
    getNotes(): number[];
    getNote(): string;
    setNote(note: string): void;
  }

  interface HTTPRequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    responseType?: string;
  }

  interface HTTP {
    request(url: string, options?: HTTPRequestOptions): Promise<any>;
  }

  interface Prefs {
    get(key: string, defaultValue?: any): any;
    set(key: string, value: any): void;
    clear(key: string): void;
  }

  interface Items {
    get(id: number): Item | false;
    getAsync(id: number): Promise<Item | false>;
    getAll(): Item[];
  }
}

declare const Zotero: {
  debug: (msg: string) => void;
  log: (msg: string) => void;
  logError: (error: any) => void;
  HTTP: Zotero.HTTP;
  Items: Zotero.Items;
  Prefs: Zotero.Prefs;
  Item: new (type?: string) => Zotero.Item;
  ProgressWindow: new () => any;
  Profile?: { dir: string };
  DataDirectory?: { dir: string };
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  getMainWindow: () => Window;
};

declare const Services: any;
declare const ztoolkit: any;
declare const addon: any;
