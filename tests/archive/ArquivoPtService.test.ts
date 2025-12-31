/**
 * Tests for ArquivoPtService
 */

import { ArquivoPtService } from "../../src/modules/archive/ArquivoPtService";

// Mock PreferencesManager
jest.mock("../../src/modules/preferences/PreferencesManager", () => ({
  PreferencesManager: {
    getTimeout: jest.fn().mockReturnValue(60000),
    getInstance: jest.fn().mockReturnValue({
      getPref: jest.fn(),
    }),
  },
}));

describe("ArquivoPtService", function () {
  let service: ArquivoPtService;
  let mockItem: Zotero.Item;

  beforeEach(function () {
    service = new ArquivoPtService();
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
      expect(service.name).toBe("Arquivo.pt");
    });

    it("should have correct id", function () {
      expect(service.id).toBe("arquivopt");
    });

    it("should have regionRestricted capability", function () {
      expect((service as any).config.capabilities.regionRestricted).toBe(true);
    });
  });

  describe("isAvailable", function () {
    it("should return true", async function () {
      const result = await service.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe("archive", function () {
    it("should return existing archive when found", async function () {
      const existingArchiveHtml = `
				<html>
				<body>
					<a href="/wayback/20231215120000/https://example.com/article">Archive</a>
				</body>
				</html>
			`;

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: existingArchiveHtml,
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toContain(
        "arquivo.pt/wayback/20231215120000",
      );
    });

    it("should submit new archive when no existing found", async function () {
      // First call - check existing (no match)
      // Second call - submit for archiving
      (Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({
          status: 200,
          responseText: "<html><body>No archives found</body></html>",
        })
        .mockResolvedValueOnce({
          status: 200,
          responseText: "<html><body>Archive submitted</body></html>",
        });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      // Should return fallback URL since no explicit archive URL returned
      expect(results[0].archivedUrl).toContain("arquivo.pt/wayback");
    });

    it("should extract archived URL from response", async function () {
      const responseWithUrl = `
				<html>
				<body>
					Success! Your archive: https://arquivo.pt/wayback/20231220150000/https://example.com/article
				</body>
				</html>
			`;

      (Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({
          status: 200,
          responseText: "No existing archives",
        })
        .mockResolvedValueOnce({
          status: 200,
          responseText: responseWithUrl,
        });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toBe(
        "https://arquivo.pt/wayback/20231220150000/https://example.com/article",
      );
    });

    it("should handle submission failure", async function () {
      // First call - check existing (no match)
      // Second call - submission fails with server error
      (Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({
          status: 200,
          responseText: "No existing archives",
        })
        .mockRejectedValueOnce({
          status: 500,
          responseText: "Server error",
          message: "Internal Server Error",
        });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("should handle network errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("should handle invalid URL", async function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "not-a-valid-url";
        return "";
      });

      const results = await service.archive([mockItem]);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("No valid URL found");
    });
  });

  describe("checkAvailability", function () {
    it("should return available when service responds", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: "Arquivo.pt homepage",
      });

      const result = await service.checkAvailability("https://example.com");

      expect(result.available).toBe(true);
    });

    it("should return existing URL when found", async function () {
      const archiveHtml = `
				<a href="/wayback/20231215120000/https://example.com">Link</a>
			`;

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: archiveHtml,
      });

      const result = await service.checkAvailability("https://example.com");

      expect(result.available).toBe(true);
      expect(result.existingUrl).toContain("arquivo.pt/wayback/20231215120000");
    });

    it("should return unavailable when service fails", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue(
        new Error("Connection failed"),
      );

      const result = await service.checkAvailability("https://example.com");

      expect(result.available).toBe(false);
    });
  });

  describe("URL extraction patterns", function () {
    it("should extract URL from href attribute", async function () {
      const html =
        '<a href="/wayback/20231215120000/https://test.com">Archive</a>';

      (Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({ status: 404, responseText: "" })
        .mockResolvedValueOnce({ status: 200, responseText: html });

      const results = await service.archive([mockItem]);

      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toContain(
        "arquivo.pt/wayback/20231215120000",
      );
    });

    it("should extract full URL from response body", async function () {
      const html =
        "Archived at https://arquivo.pt/wayback/20231215120000/https://test.com done";

      (Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({ status: 404, responseText: "" })
        .mockResolvedValueOnce({ status: 200, responseText: html });

      const results = await service.archive([mockItem]);

      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toBe(
        "https://arquivo.pt/wayback/20231215120000/https://test.com",
      );
    });
  });

  describe("multiple timestamps", function () {
    it("should select most recent timestamp", async function () {
      const html = `
				<a href="/wayback/20220101000000/https://example.com">Old</a>
				<a href="/wayback/20231215120000/https://example.com">Recent</a>
				<a href="/wayback/20230601000000/https://example.com">Middle</a>
			`;

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: html,
      });

      const result = await service.checkAvailability("https://example.com");

      expect(result.existingUrl).toContain("20231215120000");
    });
  });
});
