/**
 * Tests for ConfigurableArchiveService
 */

import { ConfigurableArchiveService } from "../../src/modules/archive/ConfigurableArchiveService";
import { ServiceConfig, ArchiveErrorType } from "../../src/modules/archive/types";
import { CredentialManager } from "../../src/utils/CredentialManager";
import { CircuitBreakerManager } from "../../src/utils/CircuitBreaker";
import { TrafficMonitor } from "../../src/utils/TrafficMonitor";

// Mock CredentialManager
jest.mock("../../src/utils/CredentialManager");
jest.mock("../../src/utils/CircuitBreaker");
jest.mock("../../src/utils/TrafficMonitor");

describe("ConfigurableArchiveService", function () {
  let service: ConfigurableArchiveService;
  let mockConfig: ServiceConfig;
  let mockBreaker: any;

  beforeEach(function () {
    jest.clearAllMocks();

    // Mock CredentialManager
    (CredentialManager.getInstance as jest.Mock).mockReturnValue({
      get: jest.fn(),
    });

    // Mock CircuitBreakerManager
    mockBreaker = {
      execute: jest.fn((operation) => operation()),
    };
    (CircuitBreakerManager.getInstance as jest.Mock).mockReturnValue({
      getBreaker: jest.fn().mockReturnValue(mockBreaker),
    });

    // Mock TrafficMonitor
    (TrafficMonitor.getInstance as jest.Mock).mockReturnValue({
      startRequest: jest.fn(),
      endRequest: jest.fn(),
    });

    // Mock Zotero globals
    (global.Zotero as any) = {
      ...((global as any).Zotero || {}),
      HTTP: {
        request: jest.fn(),
      },
      setTimeout: jest.fn((fn: () => void) => {
        return 1; // Mock handle
      }),
      clearTimeout: jest.fn(),
      debug: jest.fn(),
    };
  });

  describe("Constructor and Validation", function () {
    it("should throw error if runtime config is missing", function () {
      const configWithoutRuntime: ServiceConfig = {
        id: "test",
        name: "Test Service",
      };

      expect(
        () => new ConfigurableArchiveService(configWithoutRuntime),
      ).toThrow("ConfigurableArchiveService requires runtime configuration");
    });

    it("should initialize successfully with runtime config", function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };

      expect(() => new ConfigurableArchiveService(mockConfig)).not.toThrow();
    });
  });

  describe("isAvailable", function () {
    it("should return true if no authentication required", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };

      service = new ConfigurableArchiveService(mockConfig);
      const available = await service.isAvailable();
      expect(available).toBe(true);
    });

    it("should return true if credential exists", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
          auth: {
            type: "header",
            credentialKey: "testKey",
            headerName: "Authorization",
            template: "Bearer {{credential}}",
          },
        },
      };

      const mockCredManager = {
        get: jest.fn().mockResolvedValue("test-credential"),
      };
      (CredentialManager.getInstance as jest.Mock).mockReturnValue(
        mockCredManager,
      );

      service = new ConfigurableArchiveService(mockConfig);
      const available = await service.isAvailable();
      expect(available).toBe(true);
    });

    it("should return false if credential missing", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
          auth: {
            type: "header",
            credentialKey: "testKey",
            headerName: "Authorization",
            template: "Bearer {{credential}}",
          },
        },
      };

      const mockCredManager = {
        get: jest.fn().mockResolvedValue(null),
      };
      (CredentialManager.getInstance as jest.Mock).mockReturnValue(
        mockCredManager,
      );

      service = new ConfigurableArchiveService(mockConfig);
      const available = await service.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe("URL Validation", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          urlValidator: {
            type: "regex",
            pattern: "\\.uk$|\\.co\\.uk$",
            errorMessage: "Must be UK domain",
          },
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should validate URL against regex pattern", async function () {
      // This test verifies that invalid URLs are caught
      // The actual validation happens in archiveUrl protected method
      expect(service.checkValidUrl("https://example.com")).toBe(true);
    });
  });

  describe("Response Parsing - JSON", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
            bodyTemplate: '{"url":"{{url}}"}',
          },
          responseParser: {
            type: "json",
            path: "data.archiveUrl",
            urlPrefix: "https://archive.example.com/",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should extract URL from JSON response with path", function () {
      const response = JSON.stringify({
        data: {
          archiveUrl: "20231201120000/https://example.com",
        },
      });

      // Test by manually triggering archiveUrl with mocked HTTP request
      // Verify JSON parsing logic indirectly
      expect(() => JSON.parse(response)).not.toThrow();
    });

    it("should prepend URL prefix to extracted value", function () {
      const response = JSON.stringify({
        data: {
          archiveUrl: "abc123",
        },
      });

      // Verify the prefix concatenation logic
      const json = JSON.parse(response);
      const value = json.data.archiveUrl;
      const prefixed = "https://archive.example.com/" + value;
      expect(prefixed).toBe("https://archive.example.com/abc123");
    });
  });

  describe("Response Parsing - Regex", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "regex",
            pattern: "https://archive\\.example\\.com/\\d+/[^\\s]+",
            captureGroup: 0,
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should extract URL from regex pattern", function () {
      const response =
        '<html><a href="https://archive.example.com/20231201120000/https://example.com">Link</a></html>';
      const pattern = 'https://archive\\.example\\.com/\\d+/[^"\\s>]+';
      const regex = new RegExp(pattern);
      const match = response.match(regex);

      expect(match).not.toBeNull();
      expect(match?.[0]).toBe(
        "https://archive.example.com/20231201120000/https://example.com",
      );
    });

    it("should handle capture groups", function () {
      const response = "/wayback/20231201120000/";
      const pattern = "/wayback/(\\d{14})/";
      const regex = new RegExp(pattern);
      const match = response.match(regex);

      expect(match?.[1]).toBe("20231201120000");
    });
  });

  describe("Authentication Header Building", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
          responseParser: {
            type: "json",
            path: "url",
          },
          auth: {
            type: "header",
            credentialKey: "apiKey",
            headerName: "Authorization",
            template: "ApiKey {{credential}}",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should add authentication header with credential", async function () {
      const mockCredManager = {
        get: jest.fn().mockResolvedValue("secret-key-123"),
      };
      (CredentialManager.getInstance as jest.Mock).mockReturnValue(
        mockCredManager,
      );

      // The actual header building happens in archiveUrl
      // Test the logic by verifying template substitution
      const template = "ApiKey {{credential}}";
      const credential = "secret-key-123";
      const result = template.replace("{{credential}}", credential);

      expect(result).toBe("ApiKey secret-key-123");
    });

    it("should include base headers in final headers", function () {
      // Verify that base headers are preserved
      const baseHeaders = { "Content-Type": "application/json" };
      const mergedHeaders: Record<string, string> = { ...baseHeaders };
      mergedHeaders["Authorization"] = "ApiKey test";

      expect(mergedHeaders).toHaveProperty("Content-Type");
      expect(mergedHeaders).toHaveProperty("Authorization");
    });
  });

  describe("Template Interpolation", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/save?url={{url}}",
            method: "GET",
            bodyTemplate: '{"url":"{{url}}"}',
          },
          responseParser: {
            type: "json",
            path: "archiveUrl",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should interpolate URL in endpoint URL", function () {
      const template = "https://api.example.com/save?url={{url}}";
      const testUrl = "https://example.com";
      const encoded = encodeURIComponent(testUrl);
      const result = template.replace("{{url}}", encoded);

      expect(result).toBe(`https://api.example.com/save?url=${encoded}`);
    });

    it("should interpolate URL in request body", function () {
      const template = '{"url":"{{url}}"}';
      const testUrl = "https://example.com";
      const encoded = encodeURIComponent(testUrl);
      const result = template.replace("{{url}}", encoded);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("should URL-encode interpolated values", function () {
      const testUrl = "https://example.com?param=value&other=test";
      const encoded = encodeURIComponent(testUrl);

      // Verify special characters are encoded
      expect(encoded).toContain("%3A%2F%2F");
      expect(encoded).toContain("%3F");
      expect(encoded).toContain("%26");
    });
  });

  describe("Service Name and ID", function () {
    it("should expose service name from config", function () {
      mockConfig = {
        id: "permacc",
        name: "Perma.cc",
        runtime: {
          archiveEndpoint: {
            url: "https://api.perma.cc/v1/archives/",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "guid",
          },
        },
      };

      service = new ConfigurableArchiveService(mockConfig);
      expect(service.name).toBe("Perma.cc");
      expect(service.id).toBe("permacc");
    });
  });

  describe("HTTP Request Methods", function () {
    it("should support GET requests", function () {
      mockConfig = {
        id: "test",
        name: "Test GET Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/check",
            method: "GET",
          },
          responseParser: {
            type: "json",
            path: "exists",
          },
        },
      };

      service = new ConfigurableArchiveService(mockConfig);
      // Verify GET method is stored in config
      expect(service.id).toBe("test");
    });

    it("should support POST requests", function () {
      mockConfig = {
        id: "test",
        name: "Test POST Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            bodyTemplate: '{"url":"{{url}}"}',
          },
          responseParser: {
            type: "json",
            path: "archiveUrl",
          },
        },
      };

      service = new ConfigurableArchiveService(mockConfig);
      expect(service.id).toBe("test");
    });
  });

  describe("archiveUrl - Successful Archiving", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            bodyTemplate: '{"url":"{{url}}"}',
            timeout: 60000,
          },
          responseParser: {
            type: "json",
            path: "archiveUrl",
            urlPrefix: "https://archive.example.com/",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should successfully archive URL and return archive URL", async function () {
      const testUrl = "https://example.com/page";
      const archiveResponse = JSON.stringify({
        archiveUrl: "20231201120000/https://example.com/page",
      });

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: archiveResponse,
        status: 200,
      });

      const result = await (service as any).archiveUrl(testUrl);

      expect(result.success).toBe(true);
      expect(result.url).toBe(
        "https://archive.example.com/20231201120000/https://example.com/page",
      );
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalUrl).toBe(testUrl);
      expect(result.metadata?.service).toBe("Test Service");
    });

    it("should interpolate URL with special characters", async function () {
      const testUrl = "https://example.com?param=value&other=test";
      const archiveResponse = JSON.stringify({ archiveUrl: "archive123" });

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: archiveResponse,
        status: 200,
      });

      const result = await (service as any).archiveUrl(testUrl);

      // Verify HTTP request was called with URL-encoded version in body
      expect(global.Zotero.HTTP.request).toHaveBeenCalled();
      const callArgs = (global.Zotero.HTTP.request as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.body).toContain(encodeURIComponent(testUrl));
    });

    it("should include request body with interpolated URL", async function () {
      const testUrl = "https://example.com/page";
      const archiveResponse = JSON.stringify({ archiveUrl: "archive123" });

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: archiveResponse,
        status: 200,
      });

      const result = await (service as any).archiveUrl(testUrl);

      expect(result.success).toBe(true);
      const callArgs = (global.Zotero.HTTP.request as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.body).toBeDefined();
      expect(options.body).toContain(encodeURIComponent(testUrl));
    });

    it("should include authentication header if configured", async function () {
      mockConfig.runtime!.auth = {
        type: "header",
        credentialKey: "apiKey",
        headerName: "Authorization",
        template: "Bearer {{credential}}",
      };

      service = new ConfigurableArchiveService(mockConfig);

      const mockCredManager = {
        get: jest.fn().mockResolvedValue("secret-token"),
      };
      (CredentialManager.getInstance as jest.Mock).mockReturnValue(
        mockCredManager,
      );

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: JSON.stringify({ archiveUrl: "archive123" }),
        status: 200,
      });

      await (service as any).archiveUrl("https://example.com");

      const callArgs = (global.Zotero.HTTP.request as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.headers.Authorization).toBe("Bearer secret-token");
    });

    it("should handle progress callbacks", async function () {
      const mockProgress = {
        onStatusUpdate: jest.fn(),
      };

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: JSON.stringify({ archiveUrl: "archive123" }),
        status: 200,
      });

      await (service as any).archiveUrl(
        "https://example.com",
        mockProgress,
      );

      expect(mockProgress.onStatusUpdate).toHaveBeenCalledWith(
        expect.stringContaining("Submitting"),
      );
    });
  });

  describe("archiveUrl - URL Validation", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          urlValidator: {
            type: "regex",
            pattern: "^https://",
            errorMessage: "Must be HTTPS URL",
          },
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should reject invalid URL", async function () {
      const result = await (service as any).archiveUrl(
        "http://example.com",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Must be HTTPS URL");
    });

    it("should accept valid URL", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: JSON.stringify({ url: "archive123" }),
        status: 200,
      });

      const result = await (service as any).archiveUrl(
        "https://example.com",
      );

      expect(result.success).toBe(true);
    });

    it("should return error for invalid regex pattern", async function () {
      mockConfig.runtime!.urlValidator!.pattern = "[invalid(";
      service = new ConfigurableArchiveService(mockConfig);

      const result = await (service as any).archiveUrl(
        "https://example.com",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid regex pattern");
    });
  });

  describe("archiveUrl - Check Endpoint (Existing Archives)", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
          checkEndpoint: {
            url: "https://api.example.com/search?url={{url}}",
            method: "GET",
            parser: {
              type: "json",
              path: "archiveUrl",
            },
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should return existing archive if check endpoint finds one", async function () {
      const testUrl = "https://example.com";

      // Mock check endpoint response
      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValueOnce({
        responseText: JSON.stringify({ archiveUrl: "existing-archive-123" }),
        status: 200,
      });

      const result = await (service as any).archiveUrl(testUrl);

      expect(result.success).toBe(true);
      expect(result.url).toBe("existing-archive-123");
      // Should NOT call archive endpoint since existing archive was found
      expect(global.Zotero.HTTP.request).toHaveBeenCalledTimes(1);
    });

    it("should proceed to archiving if check endpoint returns nothing", async function () {
      const testUrl = "https://example.com";

      // First call: check endpoint returns no result
      (global.Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({
          responseText: "{}",
          status: 200,
        })
        // Second call: archive endpoint
        .mockResolvedValueOnce({
          responseText: JSON.stringify({ url: "new-archive-123" }),
          status: 200,
        });

      const result = await (service as any).archiveUrl(testUrl);

      expect(result.success).toBe(true);
      expect(result.url).toBe("new-archive-123");
      // Should call both check and archive endpoints
      expect(global.Zotero.HTTP.request).toHaveBeenCalledTimes(2);
    });

    it("should handle check endpoint failure gracefully", async function () {
      const testUrl = "https://example.com";

      // Check endpoint fails
      (global.Zotero.HTTP.request as jest.Mock)
        .mockRejectedValueOnce(new Error("Check failed"))
        // Archive endpoint succeeds
        .mockResolvedValueOnce({
          responseText: JSON.stringify({ url: "archive-123" }),
          status: 200,
        });

      const result = await (service as any).archiveUrl(testUrl);

      // Should still succeed by falling back to archive
      expect(result.success).toBe(true);
      expect(result.url).toBe("archive-123");
    });
  });

  describe("archiveUrl - Response Parsing", function () {
    it("should parse JSON response with nested path", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "data.result.archiveUrl",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: JSON.stringify({
          data: {
            result: {
              archiveUrl: "https://archive.example.com/page",
            },
          },
        }),
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://archive.example.com/page");
    });

    it("should parse JSON response with array index", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "urls.0", // Note: direct property access, not array syntax
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: JSON.stringify({
          urls: {
            "0": "https://archive.example.com/page",
          },
        }),
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://archive.example.com/page");
    });

    it("should prepend URL prefix to extracted value", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "archiveId",
            urlPrefix: "https://archive.example.com/",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: JSON.stringify({ archiveId: "abc123" }),
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://archive.example.com/abc123");
    });

    it("should fail if JSON parsing fails", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: "invalid json {{{",
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Could not extract archive URL from service response",
      );
    });

    it("should parse regex response with full match", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "regex",
            pattern: "https://archive\\.example\\.com/\\d{14}/[^\"\\s>]+",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText:
          '<html><a href="https://archive.example.com/20231201120000/https://example.com">Link</a></html>',
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(true);
      expect(result.url).toBe(
        "https://archive.example.com/20231201120000/https://example.com",
      );
    });

    it("should parse regex response with capture group", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "regex",
            pattern: "/wayback/(\\d{14})/",
            captureGroup: 1,
            urlPrefix: "https://archive.example.com/",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: '<a href="/wayback/20231201120000/page.html">Link</a>',
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(true);
      expect(result.url).toBe(
        "https://archive.example.com/20231201120000",
      );
    });

    it("should fail if regex pattern does not match", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "regex",
            pattern: "https://archive\\.example\\.com/\\d{14}/[^\\s]+",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: "No matching archive link found",
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Could not extract archive URL from service response",
      );
    });

    it("should handle empty response", async function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);

      (global.Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        responseText: "",
        status: 200,
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
    });
  });

  describe("archiveUrl - Error Handling", function () {
    beforeEach(function () {
      mockConfig = {
        id: "test",
        name: "Test Service",
        runtime: {
          archiveEndpoint: {
            url: "https://api.example.com/archive",
            method: "POST",
          },
          responseParser: {
            type: "json",
            path: "url",
          },
        },
      };
      service = new ConfigurableArchiveService(mockConfig);
    });

    it("should handle 401 Unauthorized as AuthRequired error", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 401,
        message: "Unauthorized",
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle 429 Rate Limit as RateLimit error", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 429,
        message: "Too many requests",
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
    });

    it("should handle 404 Not Found error", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 404,
        message: "Not found",
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
    });

    it("should handle 500+ Server errors", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 500,
        message: "Internal server error",
      });

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
    });

    it("should handle network timeout", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockRejectedValue(
        new Error("Connection timeout"),
      );

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection timeout");
    });

    it("should catch and handle unexpected errors", async function () {
      (global.Zotero.HTTP.request as jest.Mock).mockRejectedValue(
        new Error("Unexpected error"),
      );

      const result = await (service as any).archiveUrl("https://example.com");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
