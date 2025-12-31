/**
 * Tests for ArchiveTodayService
 */

import { ArchiveTodayService } from "../../src/modules/archive/ArchiveTodayService";

// Mock PreferencesManager with configurable proxy URL
let mockProxyUrl = "";

jest.mock("../../src/modules/preferences/PreferencesManager", () => ({
  PreferencesManager: {
    getTimeout: jest.fn().mockReturnValue(60000),
    getArchiveTodayProxyUrl: jest.fn().mockImplementation(() => mockProxyUrl),
    getInstance: jest.fn().mockReturnValue({
      getPref: jest.fn(),
    }),
  },
}));

// Helper to set mock proxy URL
const setMockProxyUrl = (url: string) => {
  mockProxyUrl = url;
};

describe("ArchiveTodayService", function () {
  let service: ArchiveTodayService;
  let mockItem: Zotero.Item;

  beforeEach(function () {
    service = new ArchiveTodayService();
    jest.clearAllMocks();

    // Create mock item
    mockItem = {
      id: 123,
      getField: jest.fn().mockImplementation((field: string) => {
        if (field === "url") return "https://example.com/article";
        if (field === "title") return "Example Article";
        if (field === "extra") return "";
        return "";
      }),
      setField: jest.fn(),
      getTags: jest.fn().mockReturnValue([]),
      addTag: jest.fn(),
      saveTx: jest.fn().mockResolvedValue(undefined),
    } as unknown as Zotero.Item;
  });

  describe("constructor", function () {
    it("should have correct name", function () {
      expect(service.name).toBe("Archive.today");
    });

    it("should have correct id", function () {
      expect(service.id).toBe("archivetoday");
    });
  });

  describe("isAvailable", function () {
    it("should return true", async function () {
      const result = await service.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe("archive via proxy", function () {
    const testProxyUrl = "https://my-archive-proxy.workers.dev/";

    beforeEach(function () {
      // Configure a proxy URL for these tests
      setMockProxyUrl(testProxyUrl);
    });

    afterEach(function () {
      // Reset to no proxy
      setMockProxyUrl("");
    });

    it("should archive successfully via configured proxy", async function () {
      const archivedUrl = "https://archive.today/abc123";

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({ archivedUrl }),
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toBe(archivedUrl);

      // Should have used the configured proxy URL
      expect(Zotero.HTTP.request).toHaveBeenCalledWith(
        testProxyUrl,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should handle proxy errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({ error: "Proxy busy" }),
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("should handle proxy returning no URL", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({}),
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe("archive directly (no proxy configured)", function () {
    beforeEach(function () {
      // Ensure no proxy is configured
      setMockProxyUrl("");
    });

    it("should archive directly when no proxy configured", async function () {
      const archivedUrl = "https://archive.today/xyz789";

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: `<input id="SHARE_LONGLINK" value="${archivedUrl}">`,
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);

      // Should have called Archive.today directly
      expect(Zotero.HTTP.request).toHaveBeenCalledWith(
        expect.stringContaining("archive.today/submit"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  describe("archive fallback behavior", function () {
    it("should handle direct submission failure gracefully", async function () {
      // No proxy configured, direct fails
      setMockProxyUrl("");

      (Zotero.HTTP.request as jest.Mock).mockRejectedValue(
        new Error("Service unavailable"),
      );

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe("checkAvailability", function () {
    // checkAvailability uses makeHttpRequest which wraps Zotero.HTTP.request
    // but the wrapper returns a different format

    it("should return available for successful check", async function () {
      // When the check request works, available should be true
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: "Some page content",
      });

      const result = await service.checkAvailability("https://example.com");

      // Service should be available even if URL not found
      expect(result.available).toBe(true);
    });
  });

  describe("error handling", function () {
    it("should handle invalid URL", async function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "not-a-valid-url";
        return "";
      });

      const results = await service.archive([mockItem]);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("No valid URL found");
    });

    it("should handle missing URL", async function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const results = await service.archive([mockItem]);

      expect(results[0].success).toBe(false);
    });
  });
});
