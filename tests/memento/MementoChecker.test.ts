/**
 * Tests for MementoChecker
 */

import { MementoChecker } from "../../src/modules/memento/MementoChecker";

describe("MementoChecker", function () {
  beforeEach(function () {
    jest.clearAllMocks();
  });

  describe("checkUrl", function () {
    it("should find mementos via aggregator", async function () {
      const timeMapResponse = JSON.stringify({
        original_uri: "https://example.com",
        timegate_uri:
          "https://timetravel.mementoweb.org/timegate/https://example.com",
        mementos: {
          list: [
            {
              uri: "https://web.archive.org/web/20231215/https://example.com",
              datetime: "2023-12-15T12:00:00Z",
            },
          ],
        },
      });

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: timeMapResponse,
      });

      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.hasMemento).toBe(true);
      expect(result.mementos.length).toBeGreaterThan(0);
      expect(result.timegate).toContain("timetravel.mementoweb.org");
    });

    it("should return empty when no mementos found", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          original_uri: "https://example.com",
          mementos: { list: [] },
        }),
      });

      const result = await MementoChecker.checkUrl("https://newsite.com");

      expect(result.hasMemento).toBe(false);
      expect(result.mementos).toHaveLength(0);
    });

    it("should handle aggregator errors gracefully", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue(
        new Error("Network error"),
      );

      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.hasMemento).toBe(false);
      expect(result.mementos).toHaveLength(0);
    });

    it("should try multiple aggregators", async function () {
      // First aggregator fails, second succeeds
      (Zotero.HTTP.request as jest.Mock)
        .mockRejectedValueOnce(new Error("First aggregator down"))
        .mockResolvedValueOnce({
          status: 200,
          responseText: JSON.stringify({
            original_uri: "https://example.com",
            mementos: {
              list: [
                {
                  uri: "https://archive.org/web/123/example.com",
                  datetime: "2023-01-01T00:00:00Z",
                },
              ],
            },
          }),
        });

      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.hasMemento).toBe(true);
    });

    it("should detect Internet Archive service from URL", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          original_uri: "https://example.com",
          mementos: {
            list: [
              {
                uri: "https://web.archive.org/web/20231215/https://example.com",
                datetime: "2023-12-15T00:00:00Z",
              },
            ],
          },
        }),
      });

      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.mementos[0].service).toBe("Internet Archive");
    });

    it("should detect Archive.today service from URL", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          original_uri: "https://example.com",
          mementos: {
            list: [
              {
                uri: "https://archive.today/abc123",
                datetime: "2023-12-15T00:00:00Z",
              },
            ],
          },
        }),
      });

      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.mementos[0].service).toBe("Archive.today");
    });
  });

  describe("checkArchive", function () {
    it("should check specific archive for memento", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          original_uri: "https://example.com",
          mementos: {
            list: [
              {
                uri: "https://web.archive.org/web/20231215/https://example.com",
                datetime: "2023-12-15T00:00:00Z",
              },
            ],
          },
        }),
      });

      const result = await MementoChecker.checkArchive(
        "https://example.com",
        "Internet Archive",
      );

      expect(result).not.toBeNull();
      expect(result?.url).toContain("web.archive.org");
      expect(result?.service).toBe("Internet Archive");
    });

    it("should return null for unknown archive", async function () {
      const result = await MementoChecker.checkArchive(
        "https://example.com",
        "Unknown Archive",
      );

      expect(result).toBeNull();
    });

    it("should return null for Archive.today (no memento support)", async function () {
      const result = await MementoChecker.checkArchive(
        "https://example.com",
        "Archive.today",
      );

      expect(result).toBeNull();
    });

    it("should return null when no mementos found", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          original_uri: "https://example.com",
          mementos: { list: [] },
        }),
      });

      const result = await MementoChecker.checkArchive(
        "https://example.com",
        "Internet Archive",
      );

      expect(result).toBeNull();
    });

    it("should handle request errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error("Failed"));

      const result = await MementoChecker.checkArchive(
        "https://example.com",
        "Internet Archive",
      );

      expect(result).toBeNull();
    });
  });

  describe("findExistingMementos", function () {
    let mockItem: Zotero.Item;

    beforeEach(function () {
      mockItem = {
        id: 123,
        getField: jest.fn(),
        getNotes: jest.fn().mockReturnValue([]),
      } as unknown as Zotero.Item;
    });

    it("should find mementos in Extra field", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return "Internet Archive: https://web.archive.org/web/20231215/https://example.com";
        }
        return "";
      });

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos).toHaveLength(1);
      expect(mementos[0].url).toContain("web.archive.org");
      expect(mementos[0].service).toBe("Internet Archive");
    });

    it("should find multiple mementos in Extra field", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return `Internet Archive: https://web.archive.org/web/20231215/https://example.com
Perma.cc: https://perma.cc/ABC-123`;
        }
        return "";
      });

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos.length).toBeGreaterThanOrEqual(1);
    });

    it("should find mementos in notes with robust links", function () {
      const mockNote = {
        getNote: jest.fn().mockReturnValue(
          `<a href="https://example.com"
						data-originalurl="https://example.com"
						data-versionurl="https://web.archive.org/web/20231215/https://example.com"
						data-versiondate="2023-12-15">Link</a>`,
        ),
      };

      (mockItem.getNotes as jest.Mock).mockReturnValue([1]);
      (Zotero.Items.get as jest.Mock).mockReturnValue(mockNote);
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos).toHaveLength(1);
      expect(mementos[0].url).toContain("web.archive.org");
    });

    it("should return empty array when no mementos found", function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos).toHaveLength(0);
    });

    it("should deduplicate mementos", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return `Archived: https://web.archive.org/web/20231215/https://example.com
Internet Archive: https://web.archive.org/web/20231215/https://example.com`;
        }
        return "";
      });

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos).toHaveLength(1);
    });

    it("should handle items without getNotes method", function () {
      delete (mockItem as any).getNotes;
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos).toHaveLength(0);
    });

    it("should detect service from Archive.today URL", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return "Archived: https://archive.today/abc123";
        }
        return "";
      });

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos[0].service).toBe("Archive.today");
    });

    it("should detect service from Arquivo.pt URL", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return "Archived: https://arquivo.pt/wayback/20231215/https://example.com";
        }
        return "";
      });

      const mementos = MementoChecker.findExistingMementos(mockItem);

      expect(mementos[0].service).toBe("Arquivo.pt");
    });
  });

  describe("fetchTimeMap", function () {
    it("should handle non-200 response", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 404,
        responseText: "Not Found",
      });

      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.hasMemento).toBe(false);
    });

    it("should handle malformed JSON", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: "Not valid JSON",
      });

      // Should not throw, just return no mementos
      const result = await MementoChecker.checkUrl("https://example.com");

      expect(result.hasMemento).toBe(false);
    });
  });
});
