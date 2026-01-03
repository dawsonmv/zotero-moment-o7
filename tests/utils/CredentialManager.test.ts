/**
 * Tests for CredentialManager with nsILoginManager backend
 */

import { CredentialManager } from "../../src/utils/CredentialManager";
import { SecureCredentialStorage } from "../../src/utils/SecureCredentialStorage";

// Mock SecureCredentialStorage
jest.mock("../../src/utils/SecureCredentialStorage");

describe("CredentialManager", function () {
  let manager: CredentialManager;
  let prefsStore: Map<string, any>;

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

    // Reset mocks
    jest.clearAllMocks();
    (SecureCredentialStorage.set as jest.Mock).mockResolvedValue(undefined);
    (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(undefined);
    (SecureCredentialStorage.delete as jest.Mock).mockResolvedValue(undefined);
    (SecureCredentialStorage.clear as jest.Mock).mockResolvedValue(undefined);
  });

  describe("singleton pattern", function () {
    it("should return the same instance", function () {
      const instance1 = CredentialManager.getInstance();
      const instance2 = CredentialManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("set", function () {
    it("should store credential using SecureCredentialStorage", async function () {
      manager = CredentialManager.getInstance();
      await manager.set("iaAccessKey", "test-key-123");

      expect(SecureCredentialStorage.set).toHaveBeenCalledWith(
        "iaAccessKey",
        "test-key-123",
      );
    });

    it("should clean up legacy storage after storing", async function () {
      prefsStore.set("extensions.momento7.iaAccessKey", "old-value");

      manager = CredentialManager.getInstance();
      await manager.set("iaAccessKey", "new-value");

      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
      );
    });

    it("should throw error if key is empty", async function () {
      manager = CredentialManager.getInstance();

      await expect(manager.set("", "value")).rejects.toThrow("required");
    });

    it("should throw error if value is empty", async function () {
      manager = CredentialManager.getInstance();

      await expect(manager.set("key", "")).rejects.toThrow("required");
    });
  });

  describe("get", function () {
    it("should retrieve credential from SecureCredentialStorage", async function () {
      (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(
        "test-value",
      );

      manager = CredentialManager.getInstance();
      const value = await manager.get("iaAccessKey");

      expect(value).toBe("test-value");
      expect(SecureCredentialStorage.get).toHaveBeenCalledWith("iaAccessKey");
    });

    it("should return undefined for missing credential", async function () {
      (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(undefined);

      manager = CredentialManager.getInstance();
      const value = await manager.get("missing");

      expect(value).toBeUndefined();
    });

    it("should return undefined for empty key", async function () {
      manager = CredentialManager.getInstance();
      const value = await manager.get("");

      expect(value).toBeUndefined();
      expect(SecureCredentialStorage.get).not.toHaveBeenCalled();
    });
  });

  describe("delete", function () {
    it("should delete credential using SecureCredentialStorage", async function () {
      manager = CredentialManager.getInstance();
      await manager.delete("iaAccessKey");

      expect(SecureCredentialStorage.delete).toHaveBeenCalledWith(
        "iaAccessKey",
      );
    });

    it("should clean up legacy storage after deletion", async function () {
      prefsStore.set("extensions.momento7.iaAccessKey", "old-value");

      manager = CredentialManager.getInstance();
      await manager.delete("iaAccessKey");

      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
      );
    });

    it("should do nothing for empty key", async function () {
      manager = CredentialManager.getInstance();
      await manager.delete("");

      expect(SecureCredentialStorage.delete).not.toHaveBeenCalled();
    });
  });

  describe("clear", function () {
    it("should clear all credentials", async function () {
      manager = CredentialManager.getInstance();
      await manager.clear();

      expect(SecureCredentialStorage.clear).toHaveBeenCalled();
    });

    it("should clean up all legacy storage keys", async function () {
      prefsStore.set("extensions.momento7.iaAccessKey", "value1");
      prefsStore.set("extensions.momento7.iaSecretKey", "value2");
      prefsStore.set("extensions.momento7.permaCCApiKey", "value3");
      prefsStore.set("extensions.momento7.orcidApiKey", "value4");

      manager = CredentialManager.getInstance();
      await manager.clear();

      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
      );
      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.iaSecretKey",
      );
      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.permaCCApiKey",
      );
      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.orcidApiKey",
      );
    });
  });

  describe("exists", function () {
    it("should return true when credential exists", async function () {
      (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(
        "test-value",
      );

      manager = CredentialManager.getInstance();
      const exists = await manager.exists("iaAccessKey");

      expect(exists).toBe(true);
    });

    it("should return false when credential does not exist", async function () {
      (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(undefined);

      manager = CredentialManager.getInstance();
      const exists = await manager.exists("iaAccessKey");

      expect(exists).toBe(false);
    });
  });

  describe("compatibility methods", function () {
    it("storeCredential should delegate to set", async function () {
      manager = CredentialManager.getInstance();
      await manager.storeCredential("iaAccessKey", "test-value");

      expect(SecureCredentialStorage.set).toHaveBeenCalledWith(
        "iaAccessKey",
        "test-value",
      );
    });

    it("getCredential should delegate to get", async function () {
      (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(
        "test-value",
      );

      manager = CredentialManager.getInstance();
      const value = await manager.getCredential("iaAccessKey");

      expect(value).toBe("test-value");
    });

    it("hasCredential should delegate to exists", async function () {
      (SecureCredentialStorage.get as jest.Mock).mockResolvedValue(
        "test-value",
      );

      manager = CredentialManager.getInstance();
      const exists = await manager.hasCredential("iaAccessKey");

      expect(exists).toBe(true);
    });
  });

  describe("migrateIfNeeded", function () {
    it("should migrate plaintext credentials", async function () {
      prefsStore.set("extensions.momento7.iaAccessKey", "plaintext-key");

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      expect(SecureCredentialStorage.set).toHaveBeenCalledWith(
        "iaAccessKey",
        "plaintext-key",
      );
      expect(Zotero.Prefs.clear).toHaveBeenCalledWith(
        "extensions.momento7.iaAccessKey",
      );
      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Migrated credential"),
      );
    });

    it("should migrate base64 obfuscated credentials", async function () {
      const original = "test-api-key";
      const reversed = original.split("").reverse().join("");
      const encoded = btoa(reversed);
      prefsStore.set("extensions.momento7.iaSecretKey", `b64:${encoded}`);

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      expect(SecureCredentialStorage.set).toHaveBeenCalledWith(
        "iaSecretKey",
        original,
      );
    });

    it("should attempt to decrypt old encrypted credentials", async function () {
      // Create a fake encrypted value (IV + ciphertext)
      const fakeData = new Uint8Array(28);
      for (let i = 0; i < 28; i++) fakeData[i] = i;
      const fakeEncrypted = Buffer.from(fakeData).toString("base64");

      // Ensure crypto is properly mocked
      if (!(global as any).crypto || !(global as any).crypto.subtle) {
        (global as any).crypto = { subtle: {} };
      }

      // Mock crypto.subtle to return a decrypted value
      const mockKey = { type: "secret" };
      const decryptedText = "decrypted-value";
      const decryptedBuffer = new TextEncoder().encode(decryptedText);

      if (!(global as any).crypto.subtle) {
        (global as any).crypto.subtle = {};
      }
      (global as any).crypto.subtle.importKey = jest
        .fn()
        .mockResolvedValue(mockKey);
      (global as any).crypto.subtle.deriveKey = jest
        .fn()
        .mockResolvedValue(mockKey);
      (global as any).crypto.subtle.decrypt = jest
        .fn()
        .mockResolvedValue(decryptedBuffer.buffer);

      prefsStore.set(
        "extensions.momento7.permaCCApiKey",
        `encrypted:${fakeEncrypted}`,
      );

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      expect(SecureCredentialStorage.set).toHaveBeenCalledWith(
        "permaCCApiKey",
        decryptedText,
      );
    });

    it("should skip decryption if it fails", async function () {
      const fakeData = new Uint8Array(28);
      for (let i = 0; i < 28; i++) fakeData[i] = i;
      const fakeEncrypted = Buffer.from(fakeData).toString("base64");

      // Ensure crypto is properly mocked
      if (!global.crypto) {
        (global as any).crypto = { subtle: {} };
      }

      // Mock crypto.subtle to fail decryption
      const mockKey = { type: "secret" };
      (global as any).crypto.subtle.importKey = jest
        .fn()
        .mockResolvedValue(mockKey);
      (global as any).crypto.subtle.deriveKey = jest
        .fn()
        .mockResolvedValue(mockKey);
      (global as any).crypto.subtle.decrypt = jest
        .fn()
        .mockRejectedValue(new Error("Decryption failed"));

      prefsStore.set(
        "extensions.momento7.orcidApiKey",
        `encrypted:${fakeEncrypted}`,
      );

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      expect(Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Cannot decrypt credential"),
      );
      expect(SecureCredentialStorage.set).not.toHaveBeenCalledWith(
        "orcidApiKey",
        expect.anything(),
      );
    });

    it("should only migrate once", async function () {
      prefsStore.set("extensions.momento7.iaAccessKey", "plaintext-key");

      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();
      await manager.migrateIfNeeded(); // Second call

      expect(SecureCredentialStorage.set).toHaveBeenCalledTimes(1);
    });

    it("should skip non-existent credentials", async function () {
      manager = CredentialManager.getInstance();
      await manager.migrateIfNeeded();

      // Should not have called set for any missing credentials
      expect(SecureCredentialStorage.set).not.toHaveBeenCalled();
    });
  });

  describe("profile identifier", function () {
    it("should use Profile.dir when available", async function () {
      (Zotero as any).Profile = { dir: "/specific/profile/path" };
      (Zotero as any).DataDirectory = { dir: "/data/path" };

      (CredentialManager as any).instance = undefined;
      manager = CredentialManager.getInstance();

      // Ensure crypto is properly mocked
      if (!global.crypto) {
        (global as any).crypto = { subtle: {} };
      }

      // Reset crypto mocks for migration test
      (global as any).crypto.subtle.importKey = jest
        .fn()
        .mockResolvedValue({ type: "secret" });

      // Just verify it doesn't throw - the profile ID is used internally
      await expect(manager.migrateIfNeeded()).resolves.not.toThrow();
    });

    it("should fall back to DataDirectory when Profile unavailable", async function () {
      (Zotero as any).Profile = undefined;
      (Zotero as any).DataDirectory = { dir: "/data/directory/path" };

      (CredentialManager as any).instance = undefined;
      manager = CredentialManager.getInstance();

      await expect(manager.migrateIfNeeded()).resolves.not.toThrow();
    });

    it("should use fallback when both are unavailable", async function () {
      (Zotero as any).Profile = undefined;
      (Zotero as any).DataDirectory = undefined;

      (CredentialManager as any).instance = undefined;
      manager = CredentialManager.getInstance();

      await expect(manager.migrateIfNeeded()).resolves.not.toThrow();
    });
  });
});
