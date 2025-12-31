/**
 * Tests for ZoteroItemHandler
 */

import { ZoteroItemHandler } from "../../src/modules/archive/ZoteroItemHandler";

describe("ZoteroItemHandler", function () {
  let mockItem: Zotero.Item;

  beforeEach(function () {
    jest.clearAllMocks();

    // Create mock item
    mockItem = {
      id: 123,
      itemType: "webpage",
      getField: jest.fn(),
      setField: jest.fn(),
      getTags: jest.fn().mockReturnValue([]),
      addTag: jest.fn(),
      getNotes: jest.fn().mockReturnValue([]),
      saveTx: jest.fn().mockResolvedValue(undefined),
    } as unknown as Zotero.Item;
  });

  describe("extractMetadata", function () {
    it("should extract basic metadata from item", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        switch (field) {
          case "url":
            return "https://example.com/article";
          case "title":
            return "Example Article";
          case "DOI":
            return "";
          default:
            return "";
        }
      });

      const metadata = ZoteroItemHandler.extractMetadata(mockItem);

      expect(metadata.url).toBe("https://example.com/article");
      expect(metadata.title).toBe("Example Article");
      expect(metadata.hasArchiveTag).toBe(false);
    });

    it("should prefer DOI URL when available", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        switch (field) {
          case "url":
            return "https://example.com/article";
          case "title":
            return "Example Article";
          case "DOI":
            return "10.1234/example";
          default:
            return "";
        }
      });

      const metadata = ZoteroItemHandler.extractMetadata(mockItem);

      expect(metadata.url).toBe("https://doi.org/10.1234/example");
      expect(metadata.doi).toBe("10.1234/example");
    });

    it("should detect archive tag", function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");
      (mockItem.getTags as jest.Mock).mockReturnValue([
        { tag: "archived" },
        { tag: "research" },
      ]);

      const metadata = ZoteroItemHandler.extractMetadata(mockItem);

      expect(metadata.hasArchiveTag).toBe(true);
      expect(metadata.tags).toContain("archived");
    });

    it("should use URL as title when title is missing", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        switch (field) {
          case "url":
            return "https://example.com/article";
          case "title":
            return "";
          default:
            return "";
        }
      });

      const metadata = ZoteroItemHandler.extractMetadata(mockItem);

      expect(metadata.title).toBe("https://example.com/article");
    });

    it("should handle items without getTags method", function () {
      delete (mockItem as any).getTags;
      (mockItem.getField as jest.Mock).mockReturnValue("https://example.com");

      const metadata = ZoteroItemHandler.extractMetadata(mockItem);

      expect(metadata.tags).toEqual([]);
      expect(metadata.hasArchiveTag).toBe(false);
    });
  });

  describe("findExistingArchives", function () {
    it("should find archives from Extra field", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return "Internet Archive: https://web.archive.org/web/12345/example.com\nPerma.cc: https://perma.cc/ABC-123";
        }
        return "";
      });

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);

      expect(archives.get("internet archive")).toBe(
        "https://web.archive.org/web/12345/example.com",
      );
      expect(archives.get("perma.cc")).toBe("https://perma.cc/ABC-123");
    });

    it("should return empty map when no archives", function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);

      expect(archives.size).toBe(0);
    });

    it("should handle Extra field with non-archive content", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") {
          return "Some random text\nAnother line without colon url";
        }
        return "";
      });

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);

      expect(archives.size).toBe(0);
    });

    it("should extract archives from notes with robust links", function () {
      const mockNote = {
        getNote: jest
          .fn()
          .mockReturnValue(
            '<a href="..." data-versionurl="https://web.archive.org/web/12345/example.com">Link</a>',
          ),
      };

      (mockItem.getNotes as jest.Mock).mockReturnValue([1]);
      (Zotero.Items.get as jest.Mock).mockReturnValue(mockNote);
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);

      expect(archives.get("internetarchive")).toBe(
        "https://web.archive.org/web/12345/example.com",
      );
    });
  });

  describe("needsArchiving", function () {
    beforeEach(function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "https://example.com";
        return "";
      });
      (mockItem.getTags as jest.Mock).mockReturnValue([]);
    });

    it("should return true for items with URL and no archive tag", function () {
      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(true);
    });

    it("should return false for items without URL", function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(false);
    });

    it("should return false for already archived items", function () {
      (mockItem.getTags as jest.Mock).mockReturnValue([{ tag: "archived" }]);

      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(false);
    });

    it("should return false for note items", function () {
      mockItem.itemType = "note";

      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(false);
    });

    it("should return false for attachment items", function () {
      mockItem.itemType = "attachment";

      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(false);
    });

    it("should return false for annotation items", function () {
      mockItem.itemType = "annotation";

      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(false);
    });

    it("should return true for regular item types", function () {
      mockItem.itemType = "journalArticle";
      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(true);

      mockItem.itemType = "webpage";
      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(true);

      mockItem.itemType = "book";
      expect(ZoteroItemHandler.needsArchiving(mockItem)).toBe(true);
    });
  });

  describe("saveArchiveToItem", function () {
    beforeEach(function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        switch (field) {
          case "url":
            return "https://example.com/article";
          case "title":
            return "Example Article";
          case "extra":
            return "";
          default:
            return "";
        }
      });
    });

    it("should update Extra field with archive URL", async function () {
      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
      );

      expect(mockItem.setField).toHaveBeenCalledWith(
        "extra",
        expect.stringContaining(
          "Internet Archive: https://web.archive.org/web/example.com",
        ),
      );
    });

    it("should add archive tag", async function () {
      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
      );

      expect(mockItem.addTag).toHaveBeenCalledWith("archived");
    });

    it("should not add duplicate archive tag", async function () {
      (mockItem.getTags as jest.Mock).mockReturnValue([{ tag: "archived" }]);

      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
      );

      expect(mockItem.addTag).not.toHaveBeenCalled();
    });

    it("should create note with robust link", async function () {
      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
      );

      // Verify note was created
      expect(Zotero.Item).toHaveBeenCalledWith("note");
    });

    it("should save item changes", async function () {
      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
      );

      expect(mockItem.saveTx).toHaveBeenCalled();
    });

    it("should append to existing Extra field", async function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra") return "Existing content";
        if (field === "url") return "https://example.com";
        if (field === "title") return "Example";
        return "";
      });

      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
      );

      expect(mockItem.setField).toHaveBeenCalledWith(
        "extra",
        expect.stringContaining("Existing content"),
      );
    });

    it("should include metadata in note", async function () {
      await ZoteroItemHandler.saveArchiveToItem(
        mockItem,
        "https://web.archive.org/web/example.com",
        "Internet Archive",
        { jobId: "job-123", timestamp: "20231215" },
      );

      // Note was created with metadata
      const noteInstance = (Zotero.Item as jest.Mock).mock.results[0].value;
      expect(noteInstance.setNote).toHaveBeenCalledWith(
        expect.stringContaining("jobId"),
      );
    });
  });

  describe("detectServiceFromUrl (via findExistingArchives)", function () {
    it("should detect Internet Archive URLs", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "extra")
          return "Archive: https://web.archive.org/web/20231215/example.com";
        return "";
      });

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);
      // The key is lowercase of the service name from Extra field
      expect(archives.has("archive")).toBe(true);
    });

    it("should detect archive.today URLs from notes", function () {
      const mockNote = {
        getNote: jest
          .fn()
          .mockReturnValue(
            '<a data-versionurl="https://archive.today/abc123">Link</a>',
          ),
      };

      (mockItem.getNotes as jest.Mock).mockReturnValue([1]);
      (Zotero.Items.get as jest.Mock).mockReturnValue(mockNote);
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);

      expect(archives.get("archivetoday")).toBe("https://archive.today/abc123");
    });

    it("should detect Perma.cc URLs from notes", function () {
      const mockNote = {
        getNote: jest
          .fn()
          .mockReturnValue(
            '<a data-versionurl="https://perma.cc/ABC-123">Link</a>',
          ),
      };

      (mockItem.getNotes as jest.Mock).mockReturnValue([1]);
      (Zotero.Items.get as jest.Mock).mockReturnValue(mockNote);
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const archives = ZoteroItemHandler.findExistingArchives(mockItem);

      expect(archives.get("permacc")).toBe("https://perma.cc/ABC-123");
    });
  });
});
