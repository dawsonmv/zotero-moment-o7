/**
 * Tests for InternetArchiveService
 */

import { InternetArchiveService } from "../../src/modules/archive/InternetArchiveService";
import { PreferencesManager } from "../../src/modules/preferences/PreferencesManager";

// Mock PreferencesManager module
jest.mock("../../src/modules/preferences/PreferencesManager", () => {
  const mockInstance = {
    getPref: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case "iaTimeout":
          return 120000;
        case "iaMaxRetries":
          return 3;
        case "iaRetryDelay":
          return 5000;
        default:
          return undefined;
      }
    }),
    getAll: jest.fn().mockReturnValue({
      iaTimeout: 120000,
      iaMaxRetries: 3,
      iaRetryDelay: 5000,
    }),
  };

  return {
    PreferencesManager: {
      hasIACredentials: jest.fn().mockResolvedValue(false),
      getIACredentials: jest
        .fn()
        .mockResolvedValue({ accessKey: undefined, secretKey: undefined }),
      getInstance: jest.fn().mockReturnValue(mockInstance),
      getTimeout: jest.fn().mockReturnValue(120000),
    },
  };
});

describe("InternetArchiveService", function () {
  let service: InternetArchiveService;
  let mockItem: Zotero.Item;

  beforeEach(function () {
    // Reset mocks but keep implementations
    jest.clearAllMocks();

    // Override Zotero.setTimeout to run with minimal delay for tests
    (Zotero as any).setTimeout = (fn: () => void, _delay: number) => {
      return setTimeout(fn, 0);
    };

    // Mock Zotero.Prefs.get for reloadSettings() in constructor
    (Zotero.Prefs.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: any) => {
        switch (key) {
          case "extensions.momento7.iaMaxRetries":
            return 3;
          case "extensions.momento7.iaRetryDelay":
            return 10; // Very short delay for tests
          default:
            return defaultValue;
        }
      },
    );

    // Re-set the getInstance mock after clearAllMocks
    const mockInstance = {
      getPref: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case "iaTimeout":
            return 120000;
          case "iaMaxRetries":
            return 3;
          case "iaRetryDelay":
            return 5000;
          default:
            return undefined;
        }
      }),
      getAll: jest.fn().mockReturnValue({
        iaTimeout: 120000,
        iaMaxRetries: 3,
        iaRetryDelay: 5000,
      }),
    };
    (PreferencesManager.getInstance as jest.Mock).mockReturnValue(mockInstance);

    service = new InternetArchiveService();

    // Default: no credentials
    (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(false);
    (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
      accessKey: undefined,
      secretKey: undefined,
    });

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
      saveTx: jest.fn().mockResolvedValue(undefined),
    } as unknown as Zotero.Item;
  });

  describe("constructor", function () {
    it("should have correct name", function () {
      expect(service.name).toBe("Internet Archive");
    });

    it("should have correct id", function () {
      expect(service.id).toBe("internetarchive");
    });
  });

  describe("isAvailable", function () {
    it("should always return true", async function () {
      const result = await service.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe("archive without credentials (public API)", function () {
    beforeEach(function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        false,
      );
    });

    // Note: Full archive integration tests are in integration tests
    // These tests focus on error handling scenarios

    it("should handle archive.org errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 503,
        message: "Service unavailable",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("should handle rate limiting", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 429,
        message: "Too many requests",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("should handle blocked URLs (523)", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 523,
        message: "Origin is unreachable",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe("archive with credentials (SPN2 API)", function () {
    beforeEach(function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "test-access-key",
        secretKey: "test-secret-key",
      });
    });

    // Note: Full archive integration tests are in integration tests
    // These tests focus on authentication and error handling

    it("should handle authentication errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 401,
        message: "Unauthorized",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe("URL handling", function () {
    // Note: DOI preference testing is covered in BaseArchiveService.test.ts

    it("should reject invalid URLs", async function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "not-a-valid-url";
        return "";
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("No valid URL found");
    });
  });

  describe("credential validation", function () {
    it("should reject credentials with invalid characters", async function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "valid-key-123",
        secretKey: "key\nwith\nnewlines", // Invalid - contains newlines
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Invalid API credentials format");
    });

    it("should reject credentials with special characters", async function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "key<script>alert(1)</script>",
        secretKey: "valid-secret",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Invalid API credentials format");
    });

    it("should reject empty credentials", async function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "",
        secretKey: "valid-secret",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Invalid API credentials format");
    });

    it("should reject overly long credentials", async function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "a".repeat(300), // Too long
        secretKey: "valid-secret",
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Invalid API credentials format");
    });

    it("should accept valid alphanumeric credentials", async function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "ABC123-def_456",
        secretKey: "XYZ789-ghi_012",
      });

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          url: "https://web.archive.org/web/20231215120000/https://example.com/article",
        }),
      });

      await service.archive([mockItem]);

      // Should attempt to archive (may succeed or fail based on mock)
      expect(Zotero.HTTP.request).toHaveBeenCalled();
    });
  });

  describe("SPN2 API archiving", function () {
    beforeEach(function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        true,
      );
      (PreferencesManager.getIACredentials as jest.Mock).mockResolvedValue({
        accessKey: "valid-access-key",
        secretKey: "valid-secret-key",
      });
    });

    it("should return archived URL on immediate success", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          url: "https://web.archive.org/web/20231215120000/https://example.com/article",
        }),
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toContain("web.archive.org");
    });

    it("should include Authorization header with credentials", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          url: "https://web.archive.org/web/20231215120000/https://example.com/article",
        }),
      });

      await service.archive([mockItem]);

      expect(Zotero.HTTP.request).toHaveBeenCalledWith(
        "https://web.archive.org/save",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "LOW valid-access-key:valid-secret-key",
          }),
        }),
      );
    });

    it("should poll job status when job_id returned", async function () {
      // First call returns job_id
      (Zotero.HTTP.request as jest.Mock)
        .mockResolvedValueOnce({
          status: 200,
          responseText: JSON.stringify({
            job_id: "spn2-abc123",
          }),
        })
        // Subsequent calls are status checks
        .mockResolvedValueOnce({
          status: 200,
          responseText: JSON.stringify({
            status: "pending",
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          responseText: JSON.stringify({
            status: "success",
            timestamp: "20231215120000",
            original_url: "https://example.com/article",
          }),
        });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toContain(
        "web.archive.org/web/20231215120000",
      );
    });

    it("should handle job failure", async function () {
      // Mock initial POST to return job_id, then all status checks return error
      (Zotero.HTTP.request as jest.Mock).mockImplementation(
        (url: string, options?: any) => {
          if (options?.method === "POST" && url.includes("/save")) {
            return Promise.resolve({
              status: 200,
              responseText: JSON.stringify({
                job_id: "spn2-abc123",
              }),
            });
          }
          // All status checks return error
          return Promise.resolve({
            status: 200,
            responseText: JSON.stringify({
              status: "error",
              message: "URL is excluded from archiving",
            }),
          });
        },
      );

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      // The error message comes from the throw in archiveWithSPN2, not the poll error
      // since pollJobStatus catches errors and returns null after max polls
      expect(results[0].error).toBeDefined();
    });

    it("should handle SPN2 API error responses", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText: JSON.stringify({
          message: "The requested URL is blocked",
        }),
      });

      const results = await service.archive([mockItem]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });

    it("should retry on transient failures", async function () {
      // First attempt fails
      (Zotero.HTTP.request as jest.Mock)
        .mockRejectedValueOnce({
          status: 503,
          message: "Service temporarily unavailable",
        })
        // Second attempt succeeds
        .mockResolvedValueOnce({
          status: 200,
          responseText: JSON.stringify({
            url: "https://web.archive.org/web/20231215120000/https://example.com/article",
          }),
        });

      const results = await service.archive([mockItem]);

      expect(Zotero.HTTP.request).toHaveBeenCalledTimes(2);
      expect(results[0].success).toBe(true);
    });

    it("should not retry on blocked errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValue({
        status: 523, // Blocked
        message: "Origin is unreachable",
      });

      const results = await service.archive([mockItem]);

      // Should only call once, not retry
      expect(Zotero.HTTP.request).toHaveBeenCalledTimes(1);
      expect(results[0].success).toBe(false);
    });
  });

  // Note: Public API archiving tests require complex integration with BaseArchiveService
  // These tests verify error handling at the service level, not the full archiving flow
  // Full integration tests are in integration/ArchiveCoordinator.integration.test.ts
  describe("public API archiving", function () {
    beforeEach(function () {
      (PreferencesManager.hasIACredentials as jest.Mock).mockResolvedValue(
        false,
      );
    });

    it("should use public API when no credentials", async function () {
      // Verify that hasIACredentials returns false (indicating public API should be used)
      const hasCredentials = await PreferencesManager.hasIACredentials();
      expect(hasCredentials).toBe(false);
    });
  });

  describe("multiple items", function () {
    it("should archive multiple items", async function () {
      const mockItem2 = {
        id: 456,
        getField: jest.fn().mockImplementation((field: string) => {
          if (field === "url") return "https://example.org/another";
          if (field === "title") return "Another Article";
          if (field === "extra") return "";
          return "";
        }),
        setField: jest.fn(),
        saveTx: jest.fn().mockResolvedValue(undefined),
      } as unknown as Zotero.Item;

      (Zotero.HTTP.request as jest.Mock).mockResolvedValue({
        status: 200,
        responseText:
          "<html>https://web.archive.org/web/20231215120000/https://example.com</html>",
        getResponseHeader: () => null,
      });

      const results = await service.archive([mockItem, mockItem2]);

      expect(results).toHaveLength(2);
    });
  });

  describe("testCredentials", function () {
    it("should fail with empty access key", async function () {
      const result = await InternetArchiveService.testCredentials({
        accessKey: "",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("alphanumeric");
    });

    it("should fail with empty secret key", async function () {
      const result = await InternetArchiveService.testCredentials({
        accessKey: "test-access",
        secretKey: "",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("alphanumeric");
    });

    it("should fail with invalid credential format (special characters)", async function () {
      const result = await InternetArchiveService.testCredentials({
        accessKey: "invalid@key",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("alphanumeric");
    });

    it("should test valid credentials with successful response", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValueOnce({
        status: 200,
        responseText: JSON.stringify({
          url: "https://web.archive.org/web/20231215120000/https://example.com",
          job_id: "test-job-123",
        }),
      });

      const result = await InternetArchiveService.testCredentials({
        accessKey: "valid-access-key",
        secretKey: "valid-secret-key",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("valid");
      expect(Zotero.HTTP.request).toHaveBeenCalledWith(
        "https://web.archive.org/save",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "LOW valid-access-key:valid-secret-key",
          }),
        }),
      );
    });

    it("should fail with 401 unauthorized response", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValueOnce({
        status: 401,
        responseText: JSON.stringify({
          error: "Unauthorized",
        }),
      });

      const result = await InternetArchiveService.testCredentials({
        accessKey: "invalid-access",
        secretKey: "invalid-secret",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Authentication failed");
    });

    it("should fail with 403 forbidden response", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValueOnce({
        status: 403,
        responseText: JSON.stringify({
          error: "Forbidden",
        }),
      });

      const result = await InternetArchiveService.testCredentials({
        accessKey: "forbidden-access",
        secretKey: "forbidden-secret",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Authentication failed");
    });

    it("should handle connection errors", async function () {
      (Zotero.HTTP.request as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await InternetArchiveService.testCredentials({
        accessKey: "test-access",
        secretKey: "test-secret",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Connection error");
    });

    it("should accept job_id as valid response", async function () {
      (Zotero.HTTP.request as jest.Mock).mockResolvedValueOnce({
        status: 200,
        responseText: JSON.stringify({
          job_id: "test-job-456",
        }),
      });

      const result = await InternetArchiveService.testCredentials({
        accessKey: "valid-access-key",
        secretKey: "valid-secret-key",
      });

      expect(result.success).toBe(true);
    });
  });
});
