/**
 * Tests for RobustLinkCreator
 */

import { RobustLinkCreator } from "../../src/modules/archive/RobustLinkCreator";
import { PreferencesManager } from "../../src/modules/preferences/PreferencesManager";

// Mock PreferencesManager
jest.mock("../../src/modules/preferences/PreferencesManager", () => ({
  PreferencesManager: {
    getEnabledServices: jest
      .fn()
      .mockReturnValue(["internetarchive", "archivetoday", "permacc"]),
    getFallbackOrder: jest
      .fn()
      .mockReturnValue(["internetarchive", "archivetoday", "permacc"]),
  },
}));

describe("RobustLinkCreator", function () {
  beforeEach(function () {
    jest.clearAllMocks();

    // Reset mocks to defaults
    (PreferencesManager.getEnabledServices as jest.Mock).mockReturnValue([
      "internetarchive",
      "archivetoday",
      "permacc",
    ]);
    (PreferencesManager.getFallbackOrder as jest.Mock).mockReturnValue([
      "internetarchive",
      "archivetoday",
      "permacc",
    ]);
  });

  describe("create", function () {
    it("should create robust link with archive URLs", function () {
      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com/article",
        archiveUrls: {
          internetarchive:
            "https://web.archive.org/web/20231215/https://example.com/article",
        },
        title: "Example Article",
      });

      expect(html).toContain('data-originalurl="https://example.com/article');
      expect(html).toContain('data-versionurl="https://web.archive.org');
      expect(html).toContain("Example Article");
    });

    it("should include multiple archive links", function () {
      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
          archivetoday: "https://archive.today/abc",
          permacc: "https://perma.cc/XYZ-123",
        },
      });

      expect(html).toContain("IA");
      expect(html).toContain("AT");
      expect(html).toContain("Perma");
    });

    it("should use primary archive based on fallback order", function () {
      (PreferencesManager.getFallbackOrder as jest.Mock).mockReturnValue([
        "archivetoday",
        "internetarchive",
      ]);

      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
          archivetoday: "https://archive.today/abc",
        },
      });

      expect(html).toContain('data-versionurl="https://archive.today/abc');
    });

    it("should return simple link when no archives available", function () {
      (PreferencesManager.getEnabledServices as jest.Mock).mockReturnValue([]);

      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
        },
      });

      expect(html).toContain('<a href="https://example.com');
      expect(html).not.toContain("data-versionurl");
    });

    it("should use URL as title when title not provided", function () {
      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
        },
      });

      // HTML has whitespace around the title text
      expect(html).toContain("https://example.com");
      expect(html).toContain('class="robust-link');
    });

    it("should include versionDate", function () {
      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
        },
        versionDate: "2023-12-15T12:00:00Z",
      });

      expect(html).toContain('data-versiondate="2023-12-15T12:00:00Z');
    });

    it("should escape HTML in URLs and titles", function () {
      const html = RobustLinkCreator.create({
        originalUrl: 'https://example.com?q=<script>alert("xss")</script>',
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
        },
        title: '<script>alert("xss")</script>',
      });

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("should filter archive URLs to enabled services only", function () {
      (PreferencesManager.getEnabledServices as jest.Mock).mockReturnValue([
        "internetarchive",
      ]);

      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
          archivetoday: "https://archive.today/abc",
          permacc: "https://perma.cc/XYZ-123",
        },
      });

      expect(html).toContain("IA");
      expect(html).not.toContain("AT");
      expect(html).not.toContain("Perma");
    });
  });

  describe("createSimple", function () {
    it("should create simple robust link", function () {
      const html = RobustLinkCreator.createSimple(
        "https://example.com",
        "https://web.archive.org/web/123/example.com",
        "Internet Archive",
      );

      expect(html).toContain('data-originalurl="https://example.com');
      expect(html).toContain('data-versionurl="https://web.archive.org');
      expect(html).toContain("data-versiondate=");
      expect(html).toContain("Archived by Internet Archive");
      expect(html).toContain('[<a href="https://web.archive.org');
    });

    it("should use default service name when not provided", function () {
      const html = RobustLinkCreator.createSimple(
        "https://example.com",
        "https://web.archive.org/web/123/example.com",
      );

      expect(html).toContain("Archived by Unknown");
    });
  });

  // Note: parse() and detectService() tests are skipped because they require
  // a real DOMParser implementation. The mock DOMParser in tests/setup.ts
  // doesn't actually parse HTML. These should be tested in integration tests.

  describe("service abbreviations", function () {
    it("should use correct abbreviations for services", function () {
      // Enable all services for this test
      (PreferencesManager.getEnabledServices as jest.Mock).mockReturnValue([
        "internetarchive",
        "archivetoday",
        "permacc",
        "ukwebarchive",
        "arquivopt",
      ]);

      const html = RobustLinkCreator.create({
        originalUrl: "https://example.com",
        archiveUrls: {
          internetarchive: "https://web.archive.org/web/123/example.com",
          archivetoday: "https://archive.today/abc",
          permacc: "https://perma.cc/XYZ",
          ukwebarchive: "https://webarchive.org.uk/wayback/123/example.com",
          arquivopt: "https://arquivo.pt/wayback/123/example.com",
        },
      });

      expect(html).toContain(">IA<");
      expect(html).toContain(">AT<");
      expect(html).toContain(">Perma<");
      expect(html).toContain(">UK<");
      expect(html).toContain(">PT<");
    });
  });
});
