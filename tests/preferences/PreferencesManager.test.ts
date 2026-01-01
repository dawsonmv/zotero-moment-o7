/**
 * Tests for PreferencesManager
 */

import { PreferencesManager } from "../../src/modules/preferences/PreferencesManager";

// Mock CredentialManager
jest.mock("../../src/utils/CredentialManager", () => ({
  CredentialManager: {
    getInstance: jest.fn().mockReturnValue({
      init: jest.fn().mockResolvedValue(undefined),
      migrateIfNeeded: jest.fn().mockResolvedValue(undefined),
      getCredential: jest.fn().mockResolvedValue(undefined),
      setCredential: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("PreferencesManager", function () {
  let manager: PreferencesManager;
  let prefsStore: Map<string, any>;

  beforeEach(function () {
    jest.clearAllMocks();

    // Reset singleton
    (PreferencesManager as any).instance = undefined;

    // Create a mock preferences store
    prefsStore = new Map();

    // Mock Zotero.Prefs
    (Zotero.Prefs.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: any) => {
        if (prefsStore.has(key)) {
          return prefsStore.get(key);
        }
        return defaultValue;
      },
    );

    (Zotero.Prefs.set as jest.Mock).mockImplementation(
      (key: string, value: any) => {
        prefsStore.set(key, value);
      },
    );

    manager = PreferencesManager.getInstance();
  });

  describe("singleton pattern", function () {
    it("should return the same instance", function () {
      const instance1 = PreferencesManager.getInstance();
      const instance2 = PreferencesManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("init", function () {
    it("should set default preferences when not set", async function () {
      await manager.init();

      expect(Zotero.Prefs.set).toHaveBeenCalled();
      expect(prefsStore.get("extensions.momento7.autoArchive")).toBe(true);
      expect(prefsStore.get("extensions.momento7.defaultService")).toBe(
        "internetarchive",
      );
    });

    it("should not override existing preferences", async function () {
      prefsStore.set("extensions.momento7.autoArchive", false);

      await manager.init();

      expect(prefsStore.get("extensions.momento7.autoArchive")).toBe(false);
    });
  });

  describe("getPref", function () {
    it("should get boolean preference", function () {
      prefsStore.set("extensions.momento7.autoArchive", false);

      const value = manager.getPref("autoArchive");

      expect(value).toBe(false);
    });

    it("should get string preference", function () {
      prefsStore.set("extensions.momento7.defaultService", "permacc");

      const value = manager.getPref("defaultService");

      expect(value).toBe("permacc");
    });

    it("should get number preference", function () {
      prefsStore.set("extensions.momento7.iaTimeout", 60000);

      const value = manager.getPref("iaTimeout");

      expect(value).toBe(60000);
    });

    it("should get array preference from comma-separated string", function () {
      prefsStore.set(
        "extensions.momento7.robustLinkServices",
        "ia,permacc,archive",
      );

      const value = manager.getPref("robustLinkServices");

      expect(value).toEqual(["ia", "permacc", "archive"]);
    });

    it("should return default for boolean when not set", function () {
      const value = manager.getPref("autoArchive");

      expect(value).toBe(true); // default
    });

    it("should return default for number when not set", function () {
      const value = manager.getPref("iaTimeout");

      expect(value).toBe(120000); // default
    });

    it("should return default array when not set", function () {
      const value = manager.getPref("fallbackOrder");

      expect(value).toEqual([
        "internetarchive",
        "archivetoday",
        "arquivopt",
        "permacc",
        "ukwebarchive",
      ]);
    });
  });

  describe("setPref", function () {
    it("should set boolean preference", function () {
      manager.setPref("autoArchive", false);

      expect(prefsStore.get("extensions.momento7.autoArchive")).toBe(false);
    });

    it("should set string preference", function () {
      manager.setPref("defaultService", "permacc");

      expect(prefsStore.get("extensions.momento7.defaultService")).toBe(
        "permacc",
      );
    });

    it("should set number preference", function () {
      manager.setPref("iaTimeout", 30000);

      expect(prefsStore.get("extensions.momento7.iaTimeout")).toBe(30000);
    });

    it("should set array preference as comma-separated string", function () {
      manager.setPref("robustLinkServices", ["ia", "permacc"]);

      expect(prefsStore.get("extensions.momento7.robustLinkServices")).toBe(
        "ia,permacc",
      );
    });
  });

  describe("getAll", function () {
    it("should return all preferences with values", function () {
      prefsStore.set("extensions.momento7.autoArchive", false);
      prefsStore.set("extensions.momento7.defaultService", "permacc");
      prefsStore.set("extensions.momento7.iaTimeout", 60000);

      const all = manager.getAll();

      expect(all.autoArchive).toBe(false);
      expect(all.defaultService).toBe("permacc");
      expect(all.iaTimeout).toBe(60000);
    });

    it("should return defaults when not set", function () {
      const all = manager.getAll();

      expect(all.autoArchive).toBe(true);
      expect(all.defaultService).toBe("internetarchive");
      expect(all.iaTimeout).toBe(120000);
    });
  });

  describe("resetToDefaults", function () {
    it("should reset preferences to defaults", function () {
      prefsStore.set("extensions.momento7.autoArchive", false);
      prefsStore.set("extensions.momento7.iaTimeout", 30000);

      manager.resetToDefaults();

      // Should have set all preferences back to defaults
      expect(prefsStore.get("extensions.momento7.autoArchive")).toBe(true);
      expect(prefsStore.get("extensions.momento7.iaTimeout")).toBe(120000);
    });
  });

  describe("static getTimeout", function () {
    it("should return IA timeout", function () {
      prefsStore.set("extensions.momento7.iaTimeout", 90000);

      const timeout = PreferencesManager.getTimeout();

      expect(timeout).toBe(90000);
    });

    it("should return default timeout when not set", function () {
      const timeout = PreferencesManager.getTimeout();

      expect(timeout).toBe(120000);
    });
  });

  describe("static getEnabledServices", function () {
    it("should return fallback order", function () {
      prefsStore.set("extensions.momento7.fallbackOrder", "ia,permacc");

      const services = PreferencesManager.getEnabledServices();

      expect(services).toEqual(["ia", "permacc"]);
    });
  });

  describe("static getFallbackOrder", function () {
    it("should return fallback order", function () {
      prefsStore.set("extensions.momento7.fallbackOrder", "permacc,ia");

      const order = PreferencesManager.getFallbackOrder();

      expect(order).toEqual(["permacc", "ia"]);
    });
  });

  describe("static getRobustLinkServices", function () {
    it("should return robust link services", function () {
      prefsStore.set("extensions.momento7.robustLinkServices", "ia,archive");

      const services = PreferencesManager.getRobustLinkServices();

      expect(services).toEqual(["ia", "archive"]);
    });
  });

  describe("static getDefaultService", function () {
    it("should return default service", function () {
      prefsStore.set("extensions.momento7.defaultService", "permacc");

      const service = PreferencesManager.getDefaultService();

      expect(service).toBe("permacc");
    });
  });

  describe("static isAutoArchiveEnabled", function () {
    it("should return true when enabled", function () {
      prefsStore.set("extensions.momento7.autoArchive", true);

      expect(PreferencesManager.isAutoArchiveEnabled()).toBe(true);
    });

    it("should return false when disabled", function () {
      prefsStore.set("extensions.momento7.autoArchive", false);

      expect(PreferencesManager.isAutoArchiveEnabled()).toBe(false);
    });
  });

  describe("static getCheckBeforeArchive", function () {
    it("should return check before archive setting", function () {
      prefsStore.set("extensions.momento7.checkBeforeArchive", false);

      expect(PreferencesManager.getCheckBeforeArchive()).toBe(false);
    });

    it("should return default when not set", function () {
      expect(PreferencesManager.getCheckBeforeArchive()).toBe(true);
    });
  });

  describe("static getArchiveAgeThreshold", function () {
    it("should return threshold in milliseconds", function () {
      prefsStore.set("extensions.momento7.archiveAgeThresholdHours", 48);

      const threshold = PreferencesManager.getArchiveAgeThreshold();

      // 48 hours * 60 minutes * 60 seconds * 1000 milliseconds
      expect(threshold).toBe(48 * 60 * 60 * 1000);
    });
  });

  describe("static getSkipExistingMementos", function () {
    it("should return skip existing mementos setting", function () {
      prefsStore.set("extensions.momento7.skipExistingMementos", true);

      expect(PreferencesManager.getSkipExistingMementos()).toBe(true);
    });

    it("should return default when not set", function () {
      expect(PreferencesManager.getSkipExistingMementos()).toBe(false);
    });
  });

  describe("alias methods", function () {
    it("shouldCheckBeforeArchive should alias getCheckBeforeArchive", function () {
      prefsStore.set("extensions.momento7.checkBeforeArchive", false);

      expect(PreferencesManager.shouldCheckBeforeArchive()).toBe(false);
    });

    it("shouldSkipExistingMementos should alias getSkipExistingMementos", function () {
      prefsStore.set("extensions.momento7.skipExistingMementos", true);

      expect(PreferencesManager.shouldSkipExistingMementos()).toBe(true);
    });

    it("getArchiveAgeThresholdMs should alias getArchiveAgeThreshold", function () {
      prefsStore.set("extensions.momento7.archiveAgeThresholdHours", 24);

      expect(PreferencesManager.getArchiveAgeThresholdMs()).toBe(
        24 * 60 * 60 * 1000,
      );
    });
  });

  describe("static credential methods", function () {
    it("hasIACredentials should return true when both keys exist", async function () {
      const { CredentialManager } = require("../../src/utils/CredentialManager");
      CredentialManager.getInstance().getCredential
        .mockResolvedValueOnce("access-key-123")
        .mockResolvedValueOnce("secret-key-456");

      const result = await PreferencesManager.hasIACredentials();

      expect(result).toBe(true);
    });

    it("hasIACredentials should return false when credentials missing", async function () {
      const { CredentialManager } = require("../../src/utils/CredentialManager");
      CredentialManager.getInstance().getCredential.mockResolvedValue(
        undefined,
      );

      const result = await PreferencesManager.hasIACredentials();

      expect(result).toBe(false);
    });

    it("getIACredentials should return both keys", async function () {
      const { CredentialManager } = require("../../src/utils/CredentialManager");
      CredentialManager.getInstance().getCredential
        .mockResolvedValueOnce("access-key-123")
        .mockResolvedValueOnce("secret-key-456");

      const result = await PreferencesManager.getIACredentials();

      expect(result.accessKey).toBe("access-key-123");
      expect(result.secretKey).toBe("secret-key-456");
    });

    it("getPermaCCApiKey should return the API key", async function () {
      const { CredentialManager } = require("../../src/utils/CredentialManager");
      CredentialManager.getInstance().getCredential.mockResolvedValue(
        "permacc-api-key-xyz",
      );

      const result = await PreferencesManager.getPermaCCApiKey();

      expect(result).toBe("permacc-api-key-xyz");
    });

    it("getArchiveTodayProxyUrl should return the proxy URL", function () {
      prefsStore.set(
        "extensions.momento7.archiveTodayProxyUrl",
        "https://my-proxy.workers.dev/",
      );

      const result = PreferencesManager.getArchiveTodayProxyUrl();

      expect(result).toBe("https://my-proxy.workers.dev/");
    });

    it("getArchiveTodayProxyUrl should return empty string when not set", function () {
      const result = PreferencesManager.getArchiveTodayProxyUrl();

      expect(result).toBe("");
    });
  });
});
