/**
 * Jest test setup
 * Mocks Zotero globals and sets up test environment
 */

/// <reference types="jest" />

// Mock Zotero global
(global as any).Zotero = {
  debug: jest.fn(),
  log: jest.fn(),
  logError: jest.fn(),
  
  // Mock HTTP
  HTTP: {
    request: jest.fn()
  },
  
  // Mock Items
  Items: {
    get: jest.fn(),
    getAsync: jest.fn(),
    getAll: jest.fn()
  },
  
  // Mock Prefs
  Prefs: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn()
  },
  
  // Mock utilities
  setTimeout: (fn: Function, delay: number) => setTimeout(fn, delay),
  clearTimeout: (id: number) => clearTimeout(id),
  
  // Mock Item constructor
  Item: jest.fn().mockImplementation((type: string) => ({
    itemType: type,
    id: Math.floor(Math.random() * 1000000),
    getField: jest.fn(),
    setField: jest.fn(),
    getTags: jest.fn().mockReturnValue([]),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    saveTx: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    getNotes: jest.fn().mockReturnValue([]),
    getNote: jest.fn(),
    setNote: jest.fn()
  })),
  
  // Mock ProgressWindow
  ProgressWindow: jest.fn().mockImplementation(() => ({
    changeHeadline: jest.fn(),
    addDescription: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    startCloseTimer: jest.fn()
  }))
} as any;

// Mock global Services
(global as any).Services = {
  scriptloader: {
    loadSubScript: jest.fn()
  }
} as any;

// Mock window
(global as any).window = {
  document: {
    createElement: jest.fn((tag: string) => {
      const element: any = {
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        innerText: '',
        attributes: new Map(),
        setAttribute: jest.fn((name: string, value: string) => {
          element.attributes.set(name, value);
        }),
        getAttribute: jest.fn((name: string): string | null => {
          return element.attributes.get(name);
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        remove: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        firstElementChild: null,
        childNodes: [],
        replaceWith: jest.fn()
      };
      return element;
    }),
    createTextNode: jest.fn((text: string) => ({ textContent: text })),
    createDocumentFragment: jest.fn(() => ({}))
  },
  openDialog: jest.fn()
} as any;

// Mock DOMParser
(global as any).DOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: jest.fn((_text: string, _type: string) => {
    return global.window.document;
  })
})) as any;

// Set test timeout
jest.setTimeout(10000);

// Add custom matchers
expect.extend({
  toBeValidUrl(received: string) {
    const pass = /^https?:\/\/.+/.test(received);
    return {
      message: () => `expected ${received} to be a valid URL`,
      pass
    };
  }
});

// Export to make this a module
export {};