/**
 * Tests for BaseArchiveService
 * Tests common functionality via a concrete test implementation
 */

import { BaseArchiveService } from "../../src/modules/archive/BaseArchiveService";
import {
  SingleArchiveResult,
  ArchiveProgress,
  ArchiveError,
  ArchiveErrorType,
  HTTPRequestOptions,
} from "../../src/modules/archive/types";

// Concrete implementation for testing abstract class
class TestArchiveService extends BaseArchiveService {
  public archiveUrlMock = jest.fn<
    Promise<SingleArchiveResult>,
    [string, ArchiveProgress?]
  >();
  public isAvailableMock = jest.fn<Promise<boolean>, []>();

  constructor() {
    super({
      name: "Test Archive",
      id: "testarchive",
      homepage: "https://test.archive.org",
      capabilities: {
        acceptsUrl: true,
        returnsUrl: true,
        preservesJavaScript: false,
        preservesInteractiveElements: false,
      },
    });
  }

  async isAvailable(): Promise<boolean> {
    return this.isAvailableMock();
  }

  protected async archiveUrl(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    return this.archiveUrlMock(url, progress);
  }

  // Expose protected methods for testing
  public testCheckValidUrl(url: string): boolean {
    return this.checkValidUrl(url);
  }

  public testGetBestUrl(item: Zotero.Item): string {
    return this.getBestUrl(item);
  }

  public testEscapeHtml(text: string): string {
    return this.escapeHtml(text);
  }

  public testCreateRobustLinkHTML(
    originalUrl: string,
    archivedUrl: string,
    linkText: string,
    useArchivedHref = false,
  ): string {
    return this.createRobustLinkHTML(
      originalUrl,
      archivedUrl,
      linkText,
      useArchivedHref,
    );
  }

  public async testCheckRateLimit(): Promise<void> {
    return this.checkRateLimit();
  }

  public testUpdateLastRequest(): void {
    this.updateLastRequest();
  }

  public testMapHttpError(error: any): ArchiveError {
    return this.mapHttpError(error);
  }

  public async testMakeHttpRequest(
    url: string,
    options: HTTPRequestOptions,
  ): Promise<{ success: boolean; data: any; error?: string; status?: number }> {
    return this.makeHttpRequest(url, options);
  }
}

describe("BaseArchiveService", function () {
  let service: TestArchiveService;
  let mockItem: Zotero.Item;

  beforeEach(function () {
    service = new TestArchiveService();
    jest.clearAllMocks();

    // Create mock item
    mockItem = {
      id: 123,
      getField: jest.fn(),
      setField: jest.fn(),
      saveTx: jest.fn().mockResolvedValue(undefined),
    } as unknown as Zotero.Item;
  });

  describe("name and id", function () {
    it("should return configured name", function () {
      expect(service.name).toBe("Test Archive");
    });

    it("should return configured id", function () {
      expect(service.id).toBe("testarchive");
    });
  });

  describe("checkValidUrl", function () {
    it("should return true for valid http URL", function () {
      expect(service.testCheckValidUrl("http://example.com")).toBe(true);
    });

    it("should return true for valid https URL", function () {
      expect(service.testCheckValidUrl("https://example.com/path")).toBe(true);
    });

    it("should return false for invalid URL", function () {
      expect(service.testCheckValidUrl("not-a-url")).toBe(false);
    });

    it("should return false for ftp URL", function () {
      expect(service.testCheckValidUrl("ftp://example.com")).toBe(false);
    });

    it("should return false for empty string", function () {
      expect(service.testCheckValidUrl("")).toBe(false);
    });
  });

  describe("getBestUrl", function () {
    it("should prefer DOI over URL field", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "DOI") return "10.1234/example";
        if (field === "url") return "https://example.com";
        return "";
      });

      expect(service.testGetBestUrl(mockItem)).toBe(
        "https://doi.org/10.1234/example",
      );
    });

    it("should return URL field when no DOI", function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "DOI") return "";
        if (field === "url") return "https://example.com";
        return "";
      });

      expect(service.testGetBestUrl(mockItem)).toBe("https://example.com");
    });

    it("should return empty string when no URL or DOI", function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      expect(service.testGetBestUrl(mockItem)).toBe("");
    });
  });

  describe("escapeHtml", function () {
    it("should escape HTML special characters", function () {
      expect(service.testEscapeHtml('<script>alert("xss")</script>')).toBe(
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
      );
    });

    it("should escape ampersand", function () {
      expect(service.testEscapeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("should escape single quotes", function () {
      expect(service.testEscapeHtml("it's")).toBe("it&#039;s");
    });

    it("should handle empty string", function () {
      expect(service.testEscapeHtml("")).toBe("");
    });

    it("should handle null/undefined", function () {
      expect(service.testEscapeHtml(null as any)).toBe("");
      expect(service.testEscapeHtml(undefined as any)).toBe("");
    });
  });

  describe("createRobustLinkHTML", function () {
    it("should create robust link with data attributes", function () {
      const result = service.testCreateRobustLinkHTML(
        "https://example.com",
        "https://archive.org/web/example.com",
        "Example",
      );

      expect(result).toContain('href="https://example.com');
      expect(result).toContain('data-originalurl="https://example.com');
      expect(result).toContain(
        'data-versionurl="https://archive.org/web/example.com',
      );
      expect(result).toContain("data-versiondate=");
      expect(result).toContain(">Example</a>");
    });

    it("should use archived URL as href when useArchivedHref is true", function () {
      const result = service.testCreateRobustLinkHTML(
        "https://example.com",
        "https://archive.org/web/example.com",
        "Example",
        true,
      );

      expect(result).toContain('href="https://archive.org/web/example.com');
    });

    it("should escape special characters in URLs", function () {
      const result = service.testCreateRobustLinkHTML(
        "https://example.com?q=test&foo=bar",
        "https://archive.org/web/example.com",
        "Test & Example",
      );

      expect(result).toContain("&amp;");
    });
  });

  describe("mapHttpError", function () {
    it("should map 429 to RateLimit error", function () {
      const error = service.testMapHttpError({ status: 429 });
      expect(error.type).toBe(ArchiveErrorType.RateLimit);
    });

    it("should map 401 to AuthRequired for authenticated services", function () {
      // Create service with auth requirement
      const authService = new TestArchiveService();
      (authService as any).config.capabilities = {
        requiresAuthentication: true,
      };

      const error = authService.testMapHttpError({ status: 401 });
      expect(error.type).toBe(ArchiveErrorType.AuthRequired);
    });

    it("should map 403 to Blocked for non-authenticated services", function () {
      const error = service.testMapHttpError({ status: 403 });
      expect(error.type).toBe(ArchiveErrorType.Blocked);
    });

    it("should map 404 to NotFound error", function () {
      const error = service.testMapHttpError({ status: 404 });
      expect(error.type).toBe(ArchiveErrorType.NotFound);
    });

    it("should map 523 to Blocked error", function () {
      const error = service.testMapHttpError({ status: 523 });
      expect(error.type).toBe(ArchiveErrorType.Blocked);
    });

    it("should map 5xx to ServerError", function () {
      const error = service.testMapHttpError({ status: 500 });
      expect(error.type).toBe(ArchiveErrorType.ServerError);

      const error502 = service.testMapHttpError({ status: 502 });
      expect(error502.type).toBe(ArchiveErrorType.ServerError);
    });

    it("should map timeout message to Timeout error", function () {
      const error = service.testMapHttpError({
        message: "Request timeout exceeded",
      });
      expect(error.type).toBe(ArchiveErrorType.Timeout);
    });

    it("should map unknown errors to Unknown type", function () {
      const error = service.testMapHttpError({
        status: 418,
        message: "I am a teapot",
      });
      expect(error.type).toBe(ArchiveErrorType.Unknown);
    });
  });

  describe("checkRateLimit", function () {
    it("should not throw when no previous request", async function () {
      await expect(service.testCheckRateLimit()).resolves.not.toThrow();
    });

    it("should throw RateLimit error when called too quickly", async function () {
      service.testUpdateLastRequest();

      await expect(service.testCheckRateLimit()).rejects.toThrow();
    });

    it("should not throw after delay has passed", async function () {
      service.testUpdateLastRequest();

      // Wait for rate limit to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await expect(service.testCheckRateLimit()).resolves.not.toThrow();
    });
  });

  describe("makeHttpRequest", function () {
    it("should return success for successful request", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: '{"result": "success"}',
        status: 200,
      });

      const result = await service.testMakeHttpRequest("https://example.com", {
        method: "GET",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBe('{"result": "success"}');
    });

    it("should return failure for failed request", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        message: "Network error",
        status: 500,
        responseText: "Server error",
      });

      const result = await service.testMakeHttpRequest("https://example.com", {
        method: "GET",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.status).toBe(500);
    });
  });

  describe("archive", function () {
    beforeEach(function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "https://example.com";
        if (field === "title") return "Example Title";
        if (field === "extra") return "";
        return "";
      });
    });

    it("should archive items successfully", async function () {
      service.archiveUrlMock.mockResolvedValue({
        success: true,
        url: "https://archive.org/web/example.com",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toBe(
        "https://archive.org/web/example.com",
      );
      expect(results[0].service).toBe("Test Archive");
    });

    it("should handle items without valid URLs", async function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("No valid URL found");
    });

    it("should handle archive failures", async function () {
      service.archiveUrlMock.mockResolvedValue({
        success: false,
        error: "Service unavailable",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Service unavailable");
    });

    it("should handle exceptions during archiving", async function () {
      service.archiveUrlMock.mockRejectedValue(new Error("Network error"));

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Network error");
    });

    it("should archive multiple items", async function () {
      const mockItem2 = {
        id: 456,
        getField: jest.fn().mockImplementation((field: string) => {
          if (field === "url") return "https://example2.com";
          if (field === "title") return "Example 2";
          if (field === "extra") return "";
          return "";
        }),
        setField: jest.fn(),
        saveTx: jest.fn().mockResolvedValue(undefined),
      } as unknown as Zotero.Item;

      service.archiveUrlMock
        .mockResolvedValueOnce({
          success: true,
          url: "https://archive.org/web/example.com",
        })
        .mockResolvedValueOnce({
          success: true,
          url: "https://archive.org/web/example2.com",
        });

      const results = await service.archive([mockItem, mockItem2]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });
});
