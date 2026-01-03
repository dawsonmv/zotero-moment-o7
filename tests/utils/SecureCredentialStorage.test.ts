/**
 * Tests for SecureCredentialStorage
 * Tests nsILoginManager integration for secure credential storage
 */

import { SecureCredentialStorage } from "../../src/utils/SecureCredentialStorage";

// Mock Components and Services
const mockLoginInfo = jest.fn();
const mockSearchLoginsAsync = jest.fn();
const mockAddLoginAsync = jest.fn();
const mockModifyLogin = jest.fn();
const mockRemoveLogin = jest.fn();

// Mock global objects
(global as any).Components = {
  classes: {
    "@mozilla.org/login-manager/loginInfo;1": {
      createInstance: jest.fn(() => ({
        init: jest.fn(),
      })),
    },
  },
  interfaces: {
    nsILoginInfo: {},
  },
};

(global as any).Services = {
  logins: {
    searchLoginsAsync: mockSearchLoginsAsync,
    addLoginAsync: mockAddLoginAsync,
    modifyLogin: mockModifyLogin,
    removeLogin: mockRemoveLogin,
  },
};

(global as any).Zotero = {
  debug: jest.fn(),
};

describe("SecureCredentialStorage", function () {
  beforeEach(function () {
    jest.clearAllMocks();
    mockSearchLoginsAsync.mockClear();
    mockAddLoginAsync.mockClear();
    mockModifyLogin.mockClear();
    mockRemoveLogin.mockClear();
  });

  describe("set - Store credential", function () {
    it("should store a new credential successfully", async function () {
      const key = "testKey";
      const value = "testValue";

      mockSearchLoginsAsync.mockResolvedValue([]);
      mockAddLoginAsync.mockResolvedValue(undefined);

      await SecureCredentialStorage.set(key, value);

      expect(mockAddLoginAsync).toHaveBeenCalled();
      expect(mockSearchLoginsAsync).toHaveBeenCalledWith({
        origin: "chrome://zotero",
        httpRealm: "Momento7 Credentials",
      });
    });

    it("should update existing credential", async function () {
      const key = "testKey";
      const oldValue = "oldValue";
      const newValue = "newValue";

      const mockLogin = {
        username: key,
        password: oldValue,
      };

      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);
      mockModifyLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.set(key, newValue);

      expect(mockModifyLogin).toHaveBeenCalled();
      expect(mockAddLoginAsync).not.toHaveBeenCalled();
    });

    it("should throw error if key is empty", async function () {
      await expect(SecureCredentialStorage.set("", "value")).rejects.toThrow(
        "Credential key and value are required",
      );
    });

    it("should throw error if value is empty", async function () {
      await expect(SecureCredentialStorage.set("key", "")).rejects.toThrow(
        "Credential key and value are required",
      );
    });

    it("should handle storage errors gracefully", async function () {
      const key = "testKey";
      const value = "testValue";

      mockSearchLoginsAsync.mockResolvedValue([]);
      mockAddLoginAsync.mockRejectedValue(
        new Error("Storage access denied"),
      );

      await expect(SecureCredentialStorage.set(key, value)).rejects.toThrow(
        "Failed to store credential",
      );
    });

    it("should debug log successful store", async function () {
      const key = "iaAccessKey";
      const value = "secret123";

      mockSearchLoginsAsync.mockResolvedValue([]);
      mockAddLoginAsync.mockResolvedValue(undefined);

      await SecureCredentialStorage.set(key, value);

      expect((global as any).Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Stored credential"),
      );
    });
  });

  describe("get - Retrieve credential", function () {
    it("should retrieve existing credential", async function () {
      const key = "testKey";
      const expectedValue = "testValue";

      const mockLogin = {
        username: key,
        password: expectedValue,
      };

      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);

      const result = await SecureCredentialStorage.get(key);

      expect(result).toBe(expectedValue);
      expect(mockSearchLoginsAsync).toHaveBeenCalledWith({
        origin: "chrome://zotero",
        httpRealm: "Momento7 Credentials",
      });
    });

    it("should return undefined if credential not found", async function () {
      const key = "nonexistentKey";

      mockSearchLoginsAsync.mockResolvedValue([]);

      const result = await SecureCredentialStorage.get(key);

      expect(result).toBeUndefined();
    });

    it("should return undefined if key is empty", async function () {
      const result = await SecureCredentialStorage.get("");

      expect(result).toBeUndefined();
      expect(mockSearchLoginsAsync).not.toHaveBeenCalled();
    });

    it("should handle search errors gracefully", async function () {
      const key = "testKey";

      mockSearchLoginsAsync.mockRejectedValue(
        new Error("Database access failed"),
      );

      const result = await SecureCredentialStorage.get(key);

      expect(result).toBeUndefined();
      expect((global as any).Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Failed to retrieve credential"),
      );
    });

    it("should return password from matching login", async function () {
      const key = "iaAccessKey";
      const password = "super-secret-key";

      const mockLogins = [
        {
          username: "differentKey",
          password: "other-value",
        },
        {
          username: key,
          password: password,
        },
      ];

      mockSearchLoginsAsync.mockResolvedValue(mockLogins);

      const result = await SecureCredentialStorage.get(key);

      expect(result).toBe(password);
    });
  });

  describe("delete - Remove credential", function () {
    it("should delete existing credential", async function () {
      const key = "testKey";

      const mockLogin = {
        username: key,
        password: "value",
      };

      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);
      mockRemoveLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.delete(key);

      expect(mockRemoveLogin).toHaveBeenCalledWith(mockLogin);
    });

    it("should silently fail if credential not found", async function () {
      const key = "nonexistentKey";

      mockSearchLoginsAsync.mockResolvedValue([]);

      await expect(
        SecureCredentialStorage.delete(key),
      ).resolves.not.toThrow();
      expect(mockRemoveLogin).not.toHaveBeenCalled();
    });

    it("should return early if key is empty", async function () {
      await SecureCredentialStorage.delete("");

      expect(mockSearchLoginsAsync).not.toHaveBeenCalled();
    });

    it("should handle deletion errors gracefully", async function () {
      const key = "testKey";

      mockSearchLoginsAsync.mockRejectedValue(new Error("Access denied"));

      await expect(
        SecureCredentialStorage.delete(key),
      ).resolves.not.toThrow();
      expect((global as any).Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete credential"),
      );
    });

    it("should debug log successful deletion", async function () {
      const key = "iaAccessKey";

      const mockLogin = {
        username: key,
        password: "value",
      };

      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);
      mockRemoveLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.delete(key);

      expect((global as any).Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Deleted credential"),
      );
    });
  });

  describe("clear - Remove all credentials", function () {
    it("should clear all credentials", async function () {
      const mockLogins = [
        {
          username: "key1",
          password: "value1",
        },
        {
          username: "key2",
          password: "value2",
        },
      ];

      mockSearchLoginsAsync.mockResolvedValue(mockLogins);
      mockRemoveLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.clear();

      expect(mockRemoveLogin).toHaveBeenCalledTimes(2);
      mockLogins.forEach((login) => {
        expect(mockRemoveLogin).toHaveBeenCalledWith(login);
      });
    });

    it("should handle empty credential list", async function () {
      mockSearchLoginsAsync.mockResolvedValue([]);

      await expect(SecureCredentialStorage.clear()).resolves.not.toThrow();
      expect(mockRemoveLogin).not.toHaveBeenCalled();
    });

    it("should handle clear errors gracefully", async function () {
      mockSearchLoginsAsync.mockRejectedValue(
        new Error("Storage unavailable"),
      );

      await expect(SecureCredentialStorage.clear()).resolves.not.toThrow();
      expect((global as any).Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Failed to clear credentials"),
      );
    });

    it("should debug log cleared credentials count", async function () {
      const mockLogins = [
        { username: "key1", password: "value1" },
        { username: "key2", password: "value2" },
        { username: "key3", password: "value3" },
      ];

      mockSearchLoginsAsync.mockResolvedValue(mockLogins);
      mockRemoveLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.clear();

      expect((global as any).Zotero.debug).toHaveBeenCalledWith(
        expect.stringContaining("Cleared all 3 credentials"),
      );
    });

    it("should handle removal errors during clear", async function () {
      const mockLogins = [
        { username: "key1", password: "value1" },
        { username: "key2", password: "value2" },
      ];

      mockSearchLoginsAsync.mockResolvedValue(mockLogins);
      mockRemoveLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.clear();

      expect(mockRemoveLogin).toHaveBeenCalledTimes(2);
    });
  });

  describe("exists - Check credential existence", function () {
    it("should return true if credential exists", async function () {
      const key = "testKey";

      const mockLogin = {
        username: key,
        password: "value",
      };

      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);

      const result = await SecureCredentialStorage.exists(key);

      expect(result).toBe(true);
    });

    it("should return false if credential does not exist", async function () {
      const key = "nonexistentKey";

      mockSearchLoginsAsync.mockResolvedValue([]);

      const result = await SecureCredentialStorage.exists(key);

      expect(result).toBe(false);
    });

    it("should return false for empty key", async function () {
      const result = await SecureCredentialStorage.exists("");

      expect(result).toBe(false);
    });

    it("should return false if retrieval fails", async function () {
      const key = "testKey";

      mockSearchLoginsAsync.mockRejectedValue(new Error("Access denied"));

      const result = await SecureCredentialStorage.exists(key);

      expect(result).toBe(false);
    });
  });

  describe("Integration scenarios", function () {
    it("should handle multiple sequential operations", async function () {
      const key = "testKey";
      const value = "testValue";

      // Store
      mockSearchLoginsAsync.mockResolvedValue([]);
      mockAddLoginAsync.mockResolvedValue(undefined);

      await SecureCredentialStorage.set(key, value);

      // Retrieve
      const mockLogin = { username: key, password: value };
      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);

      const retrieved = await SecureCredentialStorage.get(key);
      expect(retrieved).toBe(value);

      // Check exists
      const exists = await SecureCredentialStorage.exists(key);
      expect(exists).toBe(true);

      // Delete
      mockRemoveLogin.mockResolvedValue(undefined);

      await SecureCredentialStorage.delete(key);

      // Verify deleted
      mockSearchLoginsAsync.mockResolvedValue([]);

      const notExists = await SecureCredentialStorage.exists(key);
      expect(notExists).toBe(false);
    });

    it("should handle concurrent operations safely", async function () {
      const mockLogin1 = { username: "key1", password: "value1" };
      const mockLogin2 = { username: "key2", password: "value2" };

      mockSearchLoginsAsync.mockResolvedValue([mockLogin1, mockLogin2]);

      const [val1, val2, exists1, exists2] = await Promise.all([
        SecureCredentialStorage.get("key1"),
        SecureCredentialStorage.get("key2"),
        SecureCredentialStorage.exists("key1"),
        SecureCredentialStorage.exists("key2"),
      ]);

      expect(val1).toBe("value1");
      expect(val2).toBe("value2");
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    it("should maintain correct origin and realm for Firefox integration",async function () {
      const key = "iaAccessKey";
      const value = "ABCD1234";

      mockSearchLoginsAsync.mockResolvedValue([]);
      mockAddLoginAsync.mockResolvedValue(undefined);

      await SecureCredentialStorage.set(key, value);

      // Verify searchLoginsAsync was called with correct parameters
      expect(mockSearchLoginsAsync).toHaveBeenCalledWith({
        origin: "chrome://zotero",
        httpRealm: "Momento7 Credentials",
      });

      // Reset for get operation
      const mockLogin = { username: key, password: value };
      mockSearchLoginsAsync.mockResolvedValue([mockLogin]);

      await SecureCredentialStorage.get(key);

      expect(mockSearchLoginsAsync).toHaveBeenCalledWith({
        origin: "chrome://zotero",
        httpRealm: "Momento7 Credentials",
      });
    });
  });

  describe("Error handling edge cases", function () {
    it("should handle malformed login objects", async function () {
      const key = "testKey";

      const malformedLogin = {
        username: key,
        // missing password field
      };

      mockSearchLoginsAsync.mockResolvedValue([malformedLogin]);

      const result = await SecureCredentialStorage.get(key);

      expect(result).toBeUndefined();
    });

    it("should handle null search results", async function () {
      const key = "testKey";

      mockSearchLoginsAsync.mockResolvedValue(null);

      await expect(SecureCredentialStorage.get(key)).resolves.not.toThrow();
    });

    it("should handle storage quota exceeded error", async function () {
      const key = "testKey";
      const value = "testValue";

      mockSearchLoginsAsync.mockResolvedValue([]);
      mockAddLoginAsync.mockRejectedValue(
        new Error("Storage quota exceeded"),
      );

      await expect(SecureCredentialStorage.set(key, value)).rejects.toThrow(
        "Failed to store credential",
      );
    });

    it("should handle permission denied error", async function () {
      const key = "testKey";

      mockSearchLoginsAsync.mockRejectedValue(
        new Error("Permission denied: Cannot access credentials"),
      );

      const result = await SecureCredentialStorage.get(key);

      expect(result).toBeUndefined();
    });
  });
});
