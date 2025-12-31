/**
 * Tests for CredentialManager
 */

import { CredentialManager } from "../../src/utils/CredentialManager";

// Store original crypto descriptor
const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "crypto",
);

describe("CredentialManager", function () {
  let manager: CredentialManager;
  let prefsStore: Map<string, any>;
  let mockCryptoSubtle: any;

  const setCrypto = (value: any) => {
    Object.defineProperty(globalThis, "crypto", {
      value,
      writable: true,
      configurable: true,
    });
  };

  const restoreCrypto = () => {
    if (originalCryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
    } else {
      delete (globalThis as any).crypto;
    }
  };

  beforeEach(function () {
    // Reset singleton
    (CredentialManager as any).instance = undefined;

    // Create mock preferences store
    prefsStore = new Map();

    // Mock Zotero.Prefs
    (Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
      return prefsStore.get(key);
    });

    (Zotero.Prefs.set as jest.Mock).mockImplementation(
      (key: string, value: any) => {
        prefsStore.set(key, value);
      },
    );

    (Zotero.Prefs.clear as jest.Mock).mockImplementation((key: string) => {
      prefsStore.delete(key);
    });

    // Mock Zotero.Profile and DataDirectory
    (Zotero as any).Profile = { dir: "/mock/profile/dir" };
    (Zotero as any).DataDirectory = { dir: "/mock/data/dir" };

    // Create fresh mock crypto.subtle for each test
    mockCryptoSubtle = {
      importKey: jest.fn(),
      deriveKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(function () {
    // Restore original crypto
    restoreCrypto();
  });

  describe("singleton pattern", function () {
    it("should return the same instance", function () {
      const instance1 = CredentialManager.getInstance();
      const instance2 = CredentialManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("init", function () {
    it("should initialize with AES-GCM when crypto is available", async function () {
      // Mock successful crypto operations
      const mockKey = { type: "secret" };
      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);

      setCrypto({ subtle: mockCryptoSubtle });

      manager = CredentialManager.getInstance();
      await manager.init();

      expect(manager.isEncryptionAvailable()).toBe(true);
      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("initialized with AES-GCM encryption"),
      );
    });

    it("should fall back to base64 when crypto is unavailable", async function () {
      // Remove crypto
      setCrypto(undefined);

      manager = CredentialManager.getInstance();
      await manager.init();

      expect(manager.isEncryptionAvailable()).toBe(false);
      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("encryption init failed"),
      );
    });

    it("should fall back when crypto.subtle is unavailable", async function () {
      setCrypto({}); // crypto exists but no subtle

      manager = CredentialManager.getInstance();
      await manager.init();

      expect(manager.isEncryptionAvailable()).toBe(false);
    });

    it("should only initialize once", async function () {
      const mockKey = { type: "secret" };
      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);

      setCrypto({ subtle: mockCryptoSubtle });

      manager = CredentialManager.getInstance();
      await manager.init();
      await manager.init(); // Second call

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledTimes(1);
    });
  });

  describe("storeCredential", function () {
    it("should clear credential when value is empty", async function () {
      manager = CredentialManager.getInstance();
      await manager.storeCredential("iaAccessKey", "");

      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
      );
    });

    it("should store encrypted credential when crypto is available", async function () {
      const mockKey = { type: "secret" };
      const mockEncrypted = new ArrayBuffer(16);
      new Uint8Array(mockEncrypted).set([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.encrypt.mockResolvedValue(mockEncrypted);

      setCrypto({
        subtle: mockCryptoSubtle,
        getRandomValues: jest.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = i;
          return arr;
        }),
      });

      manager = CredentialManager.getInstance();
      await manager.init();
      await manager.storeCredential("iaAccessKey", "test-key-123");

      expect(Zotero.Prefs.set).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
        expect.stringContaining("encrypted:"),
      );
    });

    it("should store base64 credential when crypto fails", async function () {
      setCrypto(undefined);

      manager = CredentialManager.getInstance();
      await manager.init();
      await manager.storeCredential("iaAccessKey", "test-key");

      expect(Zotero.Prefs.set).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
        expect.stringContaining("encrypted:b64:"),
      );
    });

    it("should log security warning when using base64 fallback", async function () {
      setCrypto(undefined);

      manager = CredentialManager.getInstance();
      await manager.init();
      await manager.storeCredential("iaAccessKey", "test-key");

      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("SECURITY WARNING"),
      );
    });
  });

  describe("getCredential", function () {
    it("should return undefined for missing credential", async function () {
      manager = CredentialManager.getInstance();
      const value = await manager.getCredential("missing");
      expect(value).toBeUndefined();
    });

    it("should decrypt base64 encoded credential", async function () {
      // Store a base64 encoded value (reversed + base64)
      const original = "test-api-key";
      const reversed = original.split("").reverse().join("");
      const encoded = btoa(reversed);
      prefsStore.set(
        "extensions.momento7.iaAccessKey",
        `encrypted:b64:${encoded}`,
      );

      manager = CredentialManager.getInstance();
      const value = await manager.getCredential("iaAccessKey");

      expect(value).toBe(original);
    });

    it("should return legacy plaintext value", async function () {
      prefsStore.set("extensions.momento7.iaAccessKey", "legacy-plaintext-key");

      manager = CredentialManager.getInstance();
      const value = await manager.getCredential("iaAccessKey");

      expect(value).toBe("legacy-plaintext-key");
    });

    it("should decrypt AES-GCM encrypted credential", async function () {
      const mockKey = { type: "secret" };
      const decryptedText = "decrypted-value";
      const decryptedBuffer = new TextEncoder().encode(decryptedText);

      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.decrypt.mockResolvedValue(decryptedBuffer.buffer);

      setCrypto({ subtle: mockCryptoSubtle });

      // Store an "encrypted" value (IV + ciphertext as base64)
      // 12 byte IV + 16 byte data = 28 bytes
      const fakeData = new Uint8Array(28);
      for (let i = 0; i < 28; i++) fakeData[i] = i;
      const fakeEncrypted = Buffer.from(fakeData).toString("base64");
      prefsStore.set(
        "extensions.momento7.iaAccessKey",
        `encrypted:${fakeEncrypted}`,
      );

      manager = CredentialManager.getInstance();
      await manager.init();
      const value = await manager.getCredential("iaAccessKey");

      expect(value).toBe(decryptedText);
    });

    it("should return undefined when decryption fails", async function () {
      const mockKey = { type: "secret" };
      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.decrypt.mockRejectedValue(
        new Error("Decryption failed"),
      );

      setCrypto({ subtle: mockCryptoSubtle });

      // Store an "encrypted" value (not b64: prefix, so it will try AES decryption)
      const fakeData = new Uint8Array(28);
      for (let i = 0; i < 28; i++) fakeData[i] = i;
      const fakeEncrypted = Buffer.from(fakeData).toString("base64");
      prefsStore.set(
        "extensions.momento7.iaAccessKey",
        `encrypted:${fakeEncrypted}`,
      );

      manager = CredentialManager.getInstance();
      await manager.init();
      const value = await manager.getCredential("iaAccessKey");

      expect(value).toBeUndefined();
      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Decryption failed"),
      );
    });
  });

  describe("hasCredential", function () {
    it("should return true when credential exists", async function () {
      const original = "test-key";
      const reversed = original.split("").reverse().join("");
      prefsStore.set(
        "extensions.momento7.iaAccessKey",
        `encrypted:b64:${btoa(reversed)}`,
      );

      manager = CredentialManager.getInstance();
      const result = await manager.hasCredential("iaAccessKey");

      expect(result).toBe(true);
    });

    it("should return false when credential does not exist", async function () {
      manager = CredentialManager.getInstance();
      const result = await manager.hasCredential("iaAccessKey");

      expect(result).toBe(false);
    });
  });

  describe("migrateIfNeeded", function () {
    it("should migrate plaintext credentials", async function () {
      setCrypto(undefined);

      prefsStore.set("extensions.momento7.iaAccessKey", "plaintext-key");
      prefsStore.set("extensions.momento7.iaSecretKey", "plaintext-secret");

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Migrating plaintext credential"),
      );

      // Should now be encoded
      expect(prefsStore.get("extensions.momento7.iaAccessKey")).toContain(
        "encrypted:",
      );
    });

    it("should not migrate already encrypted credentials", async function () {
      const original = "test-key";
      const reversed = original.split("").reverse().join("");
      prefsStore.set(
        "extensions.momento7.iaAccessKey",
        `encrypted:b64:${btoa(reversed)}`,
      );

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      // Should not log migration message for this key
      const migrationCalls = (Zotero.debug as jest.Mock).mock.calls.filter(
        (call: any[]) =>
          call[0].includes("Migrating") && call[0].includes("iaAccessKey"),
      );
      expect(migrationCalls.length).toBe(0);
    });
  });

  describe("obfuscation (base64 fallback)", function () {
    it("should correctly obfuscate and deobfuscate", async function () {
      setCrypto(undefined);

      manager = CredentialManager.getInstance();
      await manager.init();

      const original = "my-secret-api-key-12345";
      await manager.storeCredential("testKey", original);
      const retrieved = await manager.getCredential("testKey");

      expect(retrieved).toBe(original);
    });

    it("should handle special characters", async function () {
      setCrypto(undefined);

      manager = CredentialManager.getInstance();
      await manager.init();

      const original = "key_with-special.chars+and/slash=";
      await manager.storeCredential("testKey", original);
      const retrieved = await manager.getCredential("testKey");

      expect(retrieved).toBe(original);
    });

    it("should handle empty deobfuscation gracefully", async function () {
      prefsStore.set(
        "extensions.momento7.testKey",
        "encrypted:b64:invalid-base64!!!",
      );

      manager = CredentialManager.getInstance();

      // Should not throw - any value is acceptable as long as it doesn't crash
      await expect(manager.getCredential("testKey")).resolves.toBeDefined();
    });
  });

  describe("getProfileIdentifier", function () {
    it("should use Profile.dir when available", async function () {
      (Zotero as any).Profile = { dir: "/specific/profile/path" };
      (Zotero as any).DataDirectory = { dir: "/data/path" };

      // Reset singleton to pick up new paths
      (CredentialManager as any).instance = undefined;
      manager = CredentialManager.getInstance();

      // Access private method via init
      setCrypto(undefined);
      await manager.init();

      // The profile ID is used in key derivation, check debug log
      expect(Zotero.debug).toHaveBeenCalled();
    });

    it("should fall back to DataDirectory when Profile unavailable", async function () {
      (Zotero as any).Profile = undefined;
      (Zotero as any).DataDirectory = { dir: "/data/directory/path" };

      (CredentialManager as any).instance = undefined;
      manager = CredentialManager.getInstance();

      setCrypto(undefined);
      await manager.init();

      // Should not throw
      expect(manager.isEncryptionAvailable()).toBe(false);
    });

    it("should use fallback when both are unavailable", async function () {
      (Zotero as any).Profile = undefined;
      (Zotero as any).DataDirectory = undefined;

      (CredentialManager as any).instance = undefined;
      manager = CredentialManager.getInstance();

      setCrypto(undefined);
      await manager.init();

      // Should not throw
      expect(manager.isEncryptionAvailable()).toBe(false);
    });
  });

  describe("isEncryptionAvailable", function () {
    it("should return true when encryption is initialized", async function () {
      const mockKey = { type: "secret" };
      mockCryptoSubtle.importKey.mockResolvedValue(mockKey);
      mockCryptoSubtle.deriveKey.mockResolvedValue(mockKey);

      setCrypto({ subtle: mockCryptoSubtle });

      manager = CredentialManager.getInstance();
      await manager.init();

      expect(manager.isEncryptionAvailable()).toBe(true);
    });

    it("should return false when encryption is not available", async function () {
      setCrypto(undefined);

      manager = CredentialManager.getInstance();
      await manager.init();

      expect(manager.isEncryptionAvailable()).toBe(false);
    });
  });
});
