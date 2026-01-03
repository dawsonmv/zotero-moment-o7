/**
 * Jest test setup
 * Mocks Zotero globals and sets up test environment
 */

/// <reference types="jest" />

// Add TextEncoder/TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from "util";
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Add btoa/atob for Node.js environment
(global as any).btoa = (str: string) =>
  Buffer.from(str, "binary").toString("base64");
(global as any).atob = (str: string) =>
  Buffer.from(str, "base64").toString("binary");

// Mock crypto for credential manager
const mockCrypto = {
  getRandomValues: jest.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    importKey: jest.fn().mockResolvedValue({ type: "secret" }),
    deriveKey: jest.fn().mockResolvedValue({ type: "derived" }),
    encrypt: jest.fn().mockImplementation(async (_algorithm, _key, data) => {
      // Simple mock that returns data with IV prefix
      const iv = new Uint8Array(12);
      const encrypted = new Uint8Array(data);
      return new Uint8Array([...iv, ...encrypted]).buffer;
    }),
    decrypt: jest.fn().mockImplementation(async (_algorithm, _key, data) => {
      // Simple mock that strips IV and returns data
      const arr = new Uint8Array(data);
      return arr.slice(12).buffer;
    }),
  },
};
(global as any).crypto = mockCrypto;

// Mock Components for nsILoginManager
(global as any).Components = {
  classes: {
    "@mozilla.org/login-manager/loginInfo;1": {
      createInstance: jest.fn().mockImplementation(() => {
        return {
          init: jest.fn(),
          username: "",
          password: "",
        };
      }),
    },
  },
  interfaces: {
    nsILoginInfo: {},
  },
} as any;

// Mock Zotero global
(global as any).Zotero = {
  debug: jest.fn(),
  log: jest.fn(),
  logError: jest.fn(),

  // Mock HTTP
  HTTP: {
    request: jest.fn(),
  },

  // Mock Items
  Items: {
    get: jest.fn(),
    getAsync: jest.fn(),
    getAll: jest.fn(),
  },

  // Mock Prefs
  Prefs: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },

  // Mock Profile
  Profile: {
    dir: "/mock/profile/dir",
  },

  // Mock DataDirectory
  DataDirectory: {
    dir: "/mock/data/dir",
  },

  // Mock utilities
  setTimeout: (fn: Function, delay?: number) => setTimeout(fn as any, delay),
  clearTimeout: (id: number) => clearTimeout(id as any),

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
    setNote: jest.fn(),
  })),

  // Mock ProgressWindow
  ProgressWindow: jest.fn().mockImplementation(() => ({
    changeHeadline: jest.fn(),
    addDescription: jest.fn(),
    show: jest.fn(),
    close: jest.fn(),
    startCloseTimer: jest.fn(),
  })),

  // Mock getMainWindow
  getMainWindow: jest.fn(() => ({
    confirm: jest.fn(() => true),
    alert: jest.fn(),
  })),
} as any;

// Mock global Services
(global as any).Services = {
  scriptloader: {
    loadSubScript: jest.fn(),
  },
  logins: {
    addLoginAsync: jest.fn().mockResolvedValue(undefined),
    removeLogin: jest.fn(),
    modifyLogin: jest.fn(),
    searchLoginsAsync: jest.fn().mockResolvedValue([]),
  } as any,
} as any;

// Mock ztoolkit (from zotero-plugin-toolkit)
(global as any).ztoolkit = {
  log: jest.fn(),
  ProgressWindow: jest.fn().mockImplementation(() => ({
    createLine: jest.fn().mockReturnThis(),
    show: jest.fn().mockReturnThis(),
    changeLine: jest.fn().mockReturnThis(),
    startCloseTimer: jest.fn().mockReturnThis(),
    close: jest.fn(),
  })),
  Clipboard: jest.fn().mockImplementation(() => ({
    addText: jest.fn().mockReturnThis(),
    copy: jest.fn(),
  })),
  getString: jest.fn((key: string) => key),
  UI: {
    appendElement: jest.fn(),
    createElement: jest.fn(),
  },
} as any;

// Mock addon global
(global as any).addon = {
  data: {
    prefs: null,
  },
} as any;

// Mock window
(global as any).window = {
  document: {
    createElement: jest.fn((tag: string) => {
      const element: any = {
        tagName: tag.toUpperCase(),
        innerHTML: "",
        textContent: "",
        innerText: "",
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
        replaceWith: jest.fn(),
      };
      return element;
    }),
    createTextNode: jest.fn((text: string) => ({ textContent: text })),
    createDocumentFragment: jest.fn(() => ({})),
    implementation: {
      createHTMLDocument: jest.fn(() => ({
        createElement: jest.fn((tag: string) => {
          const el: any = {
            textContent: "",
            innerHTML: "",
          };
          return el;
        }),
      })),
    },
  },
  openDialog: jest.fn(),
} as any;

// Mock document global (needed for some tests)
(global as any).document = {
  createElement: jest.fn((tag: string) => {
    const element: any = {
      tagName: tag.toUpperCase(),
      innerHTML: "",
      textContent: "",
      attributes: new Map(),
      setAttribute: jest.fn((name: string, value: string) => {
        element.attributes.set(name, value);
      }),
      getAttribute: jest.fn((name: string): string | null => {
        return element.attributes.get(name);
      }),
    };
    return element;
  }),
  implementation: {
    createHTMLDocument: jest.fn(() => ({
      createElement: jest.fn((tag: string) => {
        const el: any = {
          textContent: "",
          innerHTML: "",
        };
        return el;
      }),
    })),
  },
};

// Mock DOMParser
(global as any).DOMParser = jest.fn().mockImplementation(() => ({
  parseFromString: jest.fn((_text: string, _type: string) => {
    return global.window.document;
  }),
})) as any;

// Set test timeout
jest.setTimeout(10000);

// Add custom matchers
expect.extend({
  toBeValidUrl(received: string) {
    const pass = /^https?:\/\/.+/.test(received);
    return {
      message: () => `expected ${received} to be a valid URL`,
      pass,
    };
  },
});

// Export to make this a module
export {};
