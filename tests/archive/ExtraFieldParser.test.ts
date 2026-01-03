import { ExtraFieldParser } from "../../src/modules/archive/ExtraFieldParser";

describe("ExtraFieldParser", function () {
  describe("extractArchiveUrl", function () {
    it("should extract URL from new format", function () {
      const extra =
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com";
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBe(
        "http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should extract URL from legacy format for backward compatibility", function () {
      const extra =
        "internetarchiveArchived: http://web.archive.org/web/20231201/https://example.com";
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBe(
        "http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should trim whitespace from extracted URL", function () {
      const extra =
        "archive_internetarchive:   http://web.archive.org/web/20231201/https://example.com  ";
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBe(
        "http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should prefer new format over legacy format", function () {
      const extra = `archive_internetarchive: http://new-format.archive.org/
internetarchiveArchived: http://legacy-format.archive.org/`;
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBe("http://new-format.archive.org/");
    });

    it("should return null if service not found", function () {
      const extra = "archive_permacc: http://perma.cc/test";
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBeNull();
    });

    it("should return null for null/undefined input", function () {
      expect(
        ExtraFieldParser.extractArchiveUrl(null, "internetarchive"),
      ).toBeNull();
      expect(
        ExtraFieldParser.extractArchiveUrl(undefined, "internetarchive"),
      ).toBeNull();
      expect(
        ExtraFieldParser.extractArchiveUrl("", "internetarchive"),
      ).toBeNull();
    });

    it("should handle multiline extra field", function () {
      const extra = `Some other data
archive_internetarchive: http://web.archive.org/web/20231201/https://example.com
More data`;
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBe(
        "http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should be case-insensitive for the prefix", function () {
      const extra =
        "ARCHIVE_INTERNETARCHIVE: http://web.archive.org/web/20231201/https://example.com";
      const url = ExtraFieldParser.extractArchiveUrl(extra, "internetarchive");
      expect(url).toBe(
        "http://web.archive.org/web/20231201/https://example.com",
      );
    });
  });

  describe("extractAllArchives", function () {
    it("should extract all archives from extra field", function () {
      const extra = `archive_internetarchive: http://web.archive.org/web/20231201/https://example.com
archive_permacc: http://perma.cc/1234-5678
archive_arquivopt: http://arquivo.pt/wayback/20231201000000/https://example.com`;
      const archives = ExtraFieldParser.extractAllArchives(extra);
      expect(archives.size).toBe(3);
      expect(archives.get("internetarchive")).toBe(
        "http://web.archive.org/web/20231201/https://example.com",
      );
      expect(archives.get("permacc")).toBe("http://perma.cc/1234-5678");
      expect(archives.get("arquivopt")).toBe(
        "http://arquivo.pt/wayback/20231201000000/https://example.com",
      );
    });

    it("should handle mixed new and legacy formats", function () {
      const extra = `archive_internetarchive: http://new-ia.archive.org/
permaccArchived: http://legacy-permacc.archive.org/`;
      const archives = ExtraFieldParser.extractAllArchives(extra);
      expect(archives.size).toBe(2);
      expect(archives.get("internetarchive")).toBe(
        "http://new-ia.archive.org/",
      );
      expect(archives.get("permacc")).toBe(
        "http://legacy-permacc.archive.org/",
      );
    });

    it("should skip duplicate service IDs, preferring new format", function () {
      const extra = `archive_internetarchive: http://new-ia.archive.org/
internetarchiveArchived: http://legacy-ia.archive.org/`;
      const archives = ExtraFieldParser.extractAllArchives(extra);
      expect(archives.size).toBe(1);
      expect(archives.get("internetarchive")).toBe(
        "http://new-ia.archive.org/",
      );
    });

    it("should return empty map for null/undefined input", function () {
      expect(ExtraFieldParser.extractAllArchives(null)).toEqual(new Map());
      expect(ExtraFieldParser.extractAllArchives(undefined)).toEqual(new Map());
      expect(ExtraFieldParser.extractAllArchives("")).toEqual(new Map());
    });

    it("should ignore non-archive lines", function () {
      const extra = `Some random metadata
archive_internetarchive: http://web.archive.org/web/20231201/https://example.com
DOI: 10.1234/example
archive_permacc: http://perma.cc/1234-5678`;
      const archives = ExtraFieldParser.extractAllArchives(extra);
      expect(archives.size).toBe(2);
      expect(Array.from(archives.keys())).not.toContain("DOI");
    });
  });

  describe("writeArchiveUrl", function () {
    it("should write archive URL in new format", function () {
      const extra = "";
      const updated = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        "http://web.archive.org/web/20231201/https://example.com",
      );
      expect(updated).toContain(
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should append to existing content", function () {
      const extra = "DOI: 10.1234/example";
      const updated = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        "http://web.archive.org/web/20231201/https://example.com",
      );
      expect(updated).toContain("DOI: 10.1234/example");
      expect(updated).toContain(
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should not duplicate if entry already exists with same URL", function () {
      const extra =
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com";
      const updated = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        "http://web.archive.org/web/20231201/https://example.com",
      );
      expect(updated).toBe(extra);
    });

    it("should replace entry if URL differs", function () {
      const extra = "archive_internetarchive: http://old-url.archive.org/";
      const updated = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        "http://new-url.archive.org/",
      );
      expect(updated).not.toContain("old-url");
      expect(updated).toContain("new-url");
      expect((updated.match(/archive_internetarchive:/g) || []).length).toBe(1);
    });

    it("should replace legacy format entry with new format", function () {
      const extra = "internetarchiveArchived: http://old-format.archive.org/";
      const updated = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        "http://new-format.archive.org/",
      );
      expect(updated).not.toContain("internetarchiveArchived");
      expect(updated).toContain("archive_internetarchive");
      expect(updated).toContain("http://new-format.archive.org/");
    });

    it("should handle null/undefined extra field", function () {
      const updated1 = ExtraFieldParser.writeArchiveUrl(
        null,
        "internetarchive",
        "http://web.archive.org/web/20231201/https://example.com",
      );
      const updated2 = ExtraFieldParser.writeArchiveUrl(
        undefined,
        "internetarchive",
        "http://web.archive.org/web/20231201/https://example.com",
      );
      expect(updated1).toContain("archive_internetarchive:");
      expect(updated2).toContain("archive_internetarchive:");
    });

    it("should preserve other archives when adding a new one", function () {
      const extra = "archive_permacc: http://perma.cc/1234-5678";
      const updated = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        "http://web.archive.org/web/20231201/https://example.com",
      );
      expect(updated).toContain("archive_permacc: http://perma.cc/1234-5678");
      expect(updated).toContain(
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com",
      );
    });

    it("should handle URLs with special characters", function () {
      const url =
        "http://web.archive.org/web/20231201/https://example.com?q=test&foo=bar#section";
      const updated = ExtraFieldParser.writeArchiveUrl(
        "",
        "internetarchive",
        url,
      );
      expect(updated).toContain(url);
    });
  });

  describe("removeArchiveUrl", function () {
    it("should remove archive URL in new format", function () {
      const extra =
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com\nDOI: 10.1234/example";
      const updated = ExtraFieldParser.removeArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(updated).not.toContain("archive_internetarchive");
      expect(updated).toContain("DOI: 10.1234/example");
    });

    it("should remove archive URL in legacy format", function () {
      const extra =
        "internetarchiveArchived: http://web.archive.org/web/20231201/https://example.com\nDOI: 10.1234/example";
      const updated = ExtraFieldParser.removeArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(updated).not.toContain("internetarchiveArchived");
      expect(updated).toContain("DOI: 10.1234/example");
    });

    it("should remove both new and legacy format entries for same service", function () {
      const extra = `archive_internetarchive: http://new-format.archive.org/
internetarchiveArchived: http://legacy-format.archive.org/
DOI: 10.1234/example`;
      const updated = ExtraFieldParser.removeArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(updated).not.toContain("archive_internetarchive");
      expect(updated).not.toContain("internetarchiveArchived");
      expect(updated).toContain("DOI: 10.1234/example");
    });

    it("should preserve other archives", function () {
      const extra = `archive_internetarchive: http://web.archive.org/
archive_permacc: http://perma.cc/1234-5678`;
      const updated = ExtraFieldParser.removeArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(updated).not.toContain("archive_internetarchive");
      expect(updated).toContain("archive_permacc");
    });

    it("should handle null/undefined input", function () {
      expect(ExtraFieldParser.removeArchiveUrl(null, "internetarchive")).toBe(
        "",
      );
      expect(
        ExtraFieldParser.removeArchiveUrl(undefined, "internetarchive"),
      ).toBe("");
    });
  });

  describe("hasArchive", function () {
    it("should return true if archive exists", function () {
      const extra =
        "archive_internetarchive: http://web.archive.org/web/20231201/https://example.com";
      expect(ExtraFieldParser.hasArchive(extra, "internetarchive")).toBe(true);
    });

    it("should return false if archive does not exist", function () {
      const extra = "archive_permacc: http://perma.cc/1234-5678";
      expect(ExtraFieldParser.hasArchive(extra, "internetarchive")).toBe(false);
    });

    it("should return false for null/undefined input", function () {
      expect(ExtraFieldParser.hasArchive(null, "internetarchive")).toBe(false);
      expect(ExtraFieldParser.hasArchive(undefined, "internetarchive")).toBe(
        false,
      );
    });

    it("should detect legacy format", function () {
      const extra =
        "internetarchiveArchived: http://web.archive.org/web/20231201/https://example.com";
      expect(ExtraFieldParser.hasArchive(extra, "internetarchive")).toBe(true);
    });
  });

  describe("Round-trip consistency", function () {
    it("should write and read back the same URL", function () {
      const original =
        "http://web.archive.org/web/20231201/https://example.com";
      let extra = "";
      extra = ExtraFieldParser.writeArchiveUrl(
        extra,
        "internetarchive",
        original,
      );
      const extracted = ExtraFieldParser.extractArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(extracted).toBe(original);
    });

    it("should handle multiple services round-trip", function () {
      const services: Array<[string, string]> = [
        [
          "internetarchive",
          "http://web.archive.org/web/20231201/https://example.com",
        ],
        ["permacc", "http://perma.cc/1234-5678"],
        [
          "arquivopt",
          "http://arquivo.pt/wayback/20231201000000/https://example.com",
        ],
      ];

      let extra = "";
      for (const [serviceId, url] of services) {
        extra = ExtraFieldParser.writeArchiveUrl(extra, serviceId, url);
      }

      const extracted = ExtraFieldParser.extractAllArchives(extra);
      expect(extracted.size).toBe(3);
      for (const [serviceId, expectedUrl] of services) {
        expect(extracted.get(serviceId)).toBe(expectedUrl);
      }
    });
  });

  describe("Special characters and edge cases", function () {
    it("should handle URLs with all special characters", function () {
      const url = "http://example.com/path?q=test&foo=bar#section!@#$%^&*";
      const extra = ExtraFieldParser.writeArchiveUrl(
        "",
        "internetarchive",
        url,
      );
      const extracted = ExtraFieldParser.extractArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(extracted).toBe(url);
    });

    it("should handle empty extra field", function () {
      const url = "http://web.archive.org/web/20231201/https://example.com";
      const extra = ExtraFieldParser.writeArchiveUrl(
        "",
        "internetarchive",
        url,
      );
      expect(extra).toMatch(/^archive_internetarchive:/);
      expect(extra).not.toMatch(/^[^\S\n]*\n/); // No leading newline
    });

    it("should clean trailing whitespace when removing entries", function () {
      const extra =
        "archive_internetarchive: http://old.archive.org/    \n  \nDOI: 10.1234/example";
      const updated = ExtraFieldParser.removeArchiveUrl(
        extra,
        "internetarchive",
      );
      expect(updated).not.toContain("archive_internetarchive");
      expect(updated).toContain("DOI: 10.1234/example");
      expect(updated).not.toMatch(/^\n/); // No leading newline
    });
  });
});
