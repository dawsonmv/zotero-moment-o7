/**
 * Tests for ArchiveCoordinator
 */

import { ArchiveCoordinator } from "../../src/modules/archive/ArchiveCoordinator";
import { ServiceRegistry } from "../../src/modules/archive/ServiceRegistry";
import { MementoChecker } from "../../src/modules/memento/MementoChecker";
import { PreferencesManager } from "../../src/modules/preferences/PreferencesManager";
import { TrafficMonitor } from "../../src/utils/TrafficMonitor";

describe("ArchiveCoordinator", function () {
  let coordinator: ArchiveCoordinator;
  let mockItem: Zotero.Item;
  let mockRegistry: jest.Mocked<ServiceRegistry>;

  beforeEach(function () {
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Reset singletons
    (ArchiveCoordinator as any).instance = undefined;
    (TrafficMonitor as any).instance = undefined;

    // Mock ServiceRegistry
    mockRegistry = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAvailable: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
      init: jest.fn(),
    } as unknown as jest.Mocked<ServiceRegistry>;

    jest.spyOn(ServiceRegistry, "getInstance").mockReturnValue(mockRegistry);

    // Mock MementoChecker
    jest.spyOn(MementoChecker, "findExistingMementos").mockReturnValue([]);
    jest.spyOn(MementoChecker, "checkUrl").mockResolvedValue({
      hasMemento: false,
      mementos: [],
    });

    // Mock PreferencesManager
    jest.spyOn(PreferencesManager, "shouldCheckBeforeArchive").mockReturnValue(false);
    jest.spyOn(PreferencesManager, "shouldSkipExistingMementos").mockReturnValue(true);
    jest.spyOn(PreferencesManager, "getArchiveAgeThresholdMs").mockReturnValue(30 * 24 * 60 * 60 * 1000); // 30 days

    coordinator = ArchiveCoordinator.getInstance();

    // Create mock item
    mockItem = {
      id: 123,
      getField: jest.fn().mockImplementation((field: string) => {
        if (field === "url") return "https://example.com/article";
        if (field === "title") return "Example Article";
        return "";
      }),
      setField: jest.fn(),
      saveTx: jest.fn().mockResolvedValue(undefined),
    } as unknown as Zotero.Item;

    // Default preferences mock
    (Zotero.Prefs.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: any) => {
        if (key === "extensions.momento7.defaultService")
          return "internetarchive";
        if (key === "extensions.momento7.fallbackOrder")
          return "internetarchive,archivetoday,permacc";
        return defaultValue;
      },
    );
  });

  describe("singleton pattern", function () {
    it("should return the same instance", function () {
      const instance1 = ArchiveCoordinator.getInstance();
      const instance2 = ArchiveCoordinator.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("archiveItems", function () {
    it("should throw error for empty items array", async function () {
      await expect(coordinator.archiveItems([])).rejects.toThrow(
        "No items provided",
      );
    });

    it("should throw error for null items", async function () {
      await expect(coordinator.archiveItems(null as any)).rejects.toThrow(
        "No items provided",
      );
    });

    it("should archive with specific service", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/example.com",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      const results = await coordinator.archiveItems(
        [mockItem],
        "internetarchive",
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockService.archive).toHaveBeenCalledWith([mockItem]);
    });

    it("should throw for non-existent service", async function () {
      mockRegistry.get.mockReturnValue(undefined);

      const results = await coordinator.archiveItems([mockItem], "nonexistent");

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("not found");
    });

    it("should handle item without URL", async function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const results = await coordinator.archiveItems(
        [mockItem],
        "internetarchive",
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("no URL");
    });

    it("should handle service archive errors", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockRejectedValue(new Error("Network error")),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      const results = await coordinator.archiveItems(
        [mockItem],
        "internetarchive",
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Network error");
    });

    it("should archive multiple items", async function () {
      const mockItem2 = {
        id: 456,
        getField: jest.fn().mockImplementation((field: string) => {
          if (field === "url") return "https://example2.com";
          return "";
        }),
      } as unknown as Zotero.Item;

      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/1",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      const results = await coordinator.archiveItems(
        [mockItem, mockItem2],
        "internetarchive",
      );

      expect(results).toHaveLength(2);
      expect(mockService.archive).toHaveBeenCalledTimes(2);
    });
  });

  describe("archiveWithFallback", function () {
    it("should use fallback when no service specified", async function () {
      const mockService1 = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest
          .fn()
          .mockResolvedValue([{ item: mockItem, success: true }]),
      };

      mockRegistry.getAvailable.mockResolvedValue([
        { id: "internetarchive", service: mockService1 },
      ] as any);

      const results = await coordinator.archiveItems([mockItem]);

      expect(results[0].success).toBe(true);
    });

    it("should try next service on failure", async function () {
      const mockService1 = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest
          .fn()
          .mockResolvedValue([
            { item: mockItem, success: false, error: "Failed" },
          ]),
      };

      const mockService2 = {
        name: "Archive.today",
        id: "archivetoday",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://archive.today/abc",
          },
        ]),
      };

      mockRegistry.getAvailable.mockResolvedValue([
        { id: "internetarchive", service: mockService1 },
        { id: "archivetoday", service: mockService2 },
      ] as any);

      const results = await coordinator.archiveItems([mockItem]);

      expect(results[0].success).toBe(true);
      expect(mockService1.archive).toHaveBeenCalled();
      expect(mockService2.archive).toHaveBeenCalled();
    });

    it("should throw when no services available", async function () {
      mockRegistry.getAvailable.mockResolvedValue([]);

      const results = await coordinator.archiveItems([mockItem]);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("No archiving services available");
    });

    it("should collect all errors when all services fail", async function () {
      const mockService1 = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest
          .fn()
          .mockResolvedValue([
            { item: mockItem, success: false, error: "IA error" },
          ]),
      };

      const mockService2 = {
        name: "Archive.today",
        id: "archivetoday",
        archive: jest
          .fn()
          .mockResolvedValue([
            { item: mockItem, success: false, error: "AT error" },
          ]),
      };

      mockRegistry.getAvailable.mockResolvedValue([
        { id: "internetarchive", service: mockService1 },
        { id: "archivetoday", service: mockService2 },
      ] as any);

      const results = await coordinator.archiveItems([mockItem]);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("All archive services failed");
    });
  });

  describe("autoArchive", function () {
    it("should auto-archive with default service", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/x",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      const result = await coordinator.autoArchive(mockItem);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });

    it("should return null for item without URL", async function () {
      (mockItem.getField as jest.Mock).mockReturnValue("");

      const result = await coordinator.autoArchive(mockItem);

      expect(result).toBeNull();
    });

    it("should skip local file URLs", async function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "file:///Users/test/document.pdf";
        return "";
      });

      const result = await coordinator.autoArchive(mockItem);

      expect(result).toBeNull();
    });

    it("should skip localhost URLs", async function () {
      (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
        if (field === "url") return "http://localhost:3000/page";
        return "";
      });

      const result = await coordinator.autoArchive(mockItem);

      expect(result).toBeNull();
    });

    it("should skip private IP addresses", async function () {
      const privateIps = [
        "http://192.168.1.1/page",
        "http://10.0.0.1/page",
        "http://172.16.0.1/page",
        "http://127.0.0.1/page",
      ];

      for (const url of privateIps) {
        (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
          if (field === "url") return url;
          return "";
        });

        const result = await coordinator.autoArchive(mockItem);
        expect(result).toBeNull();
      }
    });

    it("should skip chrome:// and about:// URLs", async function () {
      const specialUrls = [
        "chrome://settings",
        "about:blank",
        "data:text/html,<h1>Test</h1>",
      ];

      for (const url of specialUrls) {
        (mockItem.getField as jest.Mock).mockImplementation((field: string) => {
          if (field === "url") return url;
          return "";
        });

        const result = await coordinator.autoArchive(mockItem);
        expect(result).toBeNull();
      }
    });

    it("should return failed result on archive error", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockRejectedValue(new Error("Failed")),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      const result = await coordinator.autoArchive(mockItem);

      // When service throws, it's caught and returned as failed result
      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.error).toContain("Failed");
    });
  });

  describe("service ordering", function () {
    it("should order services according to fallback preferences", async function () {
      const callOrder: string[] = [];

      const mockService1 = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockImplementation(() => {
          callOrder.push("ia");
          return [{ item: mockItem, success: false, error: "IA failed" }];
        }),
      };

      const mockService2 = {
        name: "Perma.cc",
        id: "permacc",
        archive: jest.fn().mockImplementation(() => {
          callOrder.push("permacc");
          return [{ item: mockItem, success: false, error: "Perma failed" }];
        }),
      };

      const mockService3 = {
        name: "Archive.today",
        id: "archivetoday",
        archive: jest.fn().mockImplementation(() => {
          callOrder.push("at");
          return [{ item: mockItem, success: true }];
        }),
      };

      // Return in different order than fallback
      mockRegistry.getAvailable.mockResolvedValue([
        { id: "permacc", service: mockService2 },
        { id: "archivetoday", service: mockService3 },
        { id: "internetarchive", service: mockService1 },
      ] as any);

      await coordinator.archiveItems([mockItem]);

      // Should be called in fallback order: ia, archivetoday, permacc
      expect(callOrder).toEqual(["ia", "at"]);
    });
  });

  describe("memento checking", function () {
    it("should check for existing stored mementos", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/example.com",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      // Enable memento checking
      (PreferencesManager.shouldCheckBeforeArchive as jest.Mock).mockReturnValue(true);

      // Mock stored mementos found
      const mockMemento = {
        url: "https://web.archive.org/web/2024/example.com",
        service: "internetarchive",
        datetime: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      };
      (MementoChecker.findExistingMementos as jest.Mock).mockReturnValue([mockMemento]);

      const results = await coordinator.archiveItems([mockItem], "internetarchive");

      // Should return existing memento result, not archive
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toContain("web.archive.org");
      expect(mockService.archive).not.toHaveBeenCalled(); // Archive service not called
    });

    it("should return remote mementos when auto-skip is enabled", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/example.com",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      // Enable memento checking and auto-skip
      (PreferencesManager.shouldCheckBeforeArchive as jest.Mock).mockReturnValue(true);
      (PreferencesManager.shouldSkipExistingMementos as jest.Mock).mockReturnValue(true);

      // Mock no stored mementos but remote mementos found
      (MementoChecker.findExistingMementos as jest.Mock).mockReturnValue([]);
      const mockRemoteMemento = {
        url: "https://archive.today/abc123",
        service: "archivetoday",
        datetime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      };
      (MementoChecker.checkUrl as jest.Mock).mockResolvedValue({
        hasMemento: true,
        mementos: [mockRemoteMemento],
      });

      const results = await coordinator.archiveItems([mockItem], "internetarchive");

      // Should use remote memento
      expect(results[0].success).toBe(true);
      expect(results[0].archivedUrl).toBe(mockRemoteMemento.url);
      expect(mockService.archive).not.toHaveBeenCalled();
    });

    it("should return info about existing memento when auto-skip is disabled", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/example.com",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      // Enable memento checking but disable auto-skip
      (PreferencesManager.shouldCheckBeforeArchive as jest.Mock).mockReturnValue(true);
      (PreferencesManager.shouldSkipExistingMementos as jest.Mock).mockReturnValue(false);

      // Mock remote mementos found
      (MementoChecker.findExistingMementos as jest.Mock).mockReturnValue([]);
      const mockRemoteMemento = {
        url: "https://archive.today/abc123",
        service: "archivetoday",
        datetime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      };
      (MementoChecker.checkUrl as jest.Mock).mockResolvedValue({
        hasMemento: true,
        mementos: [mockRemoteMemento],
      });

      const results = await coordinator.archiveItems([mockItem], "internetarchive");

      // Should return existing archive info with message
      expect(results[0].success).toBe(true);
      expect(results[0].message).toContain("Recent archive found");
      expect(results[0].existingArchive).toBeDefined();
      expect(mockService.archive).not.toHaveBeenCalled();
    });

    it("should handle memento check errors gracefully", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([
          {
            item: mockItem,
            success: true,
            archivedUrl: "https://web.archive.org/web/example.com",
          },
        ]),
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      // Enable memento checking
      (PreferencesManager.shouldCheckBeforeArchive as jest.Mock).mockReturnValue(true);

      // Mock memento check to fail
      (MementoChecker.findExistingMementos as jest.Mock).mockReturnValue([]);
      (MementoChecker.checkUrl as jest.Mock).mockRejectedValue(
        new Error("Network error checking mementos"),
      );

      const results = await coordinator.archiveItems([mockItem], "internetarchive");

      // Should proceed with archiving despite memento check failure
      expect(results[0].success).toBe(true);
      expect(mockService.archive).toHaveBeenCalled(); // Should have tried to archive
    });
  });

  describe("error handling branches", function () {
    it("should handle service returning no result", async function () {
      const mockService = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockResolvedValue([]), // No result
      };

      mockRegistry.get.mockReturnValue(mockService as any);

      const results = await coordinator.archiveItems(
        [mockItem],
        "internetarchive",
      );

      // Should return error when service returns no result
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("No result returned");
    });

    it("should handle service throwing errors", async function () {
      const mockService1 = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockRejectedValue(new Error("Service threw")),
      };

      const mockService2 = {
        name: "Archive.today",
        id: "archivetoday",
        archive: jest.fn().mockResolvedValue([
          { item: mockItem, success: true, archivedUrl: "https://archive.today/abc" },
        ]),
      };

      mockRegistry.getAvailable.mockResolvedValue([
        { id: "internetarchive", service: mockService1 },
        { id: "archivetoday", service: mockService2 },
      ] as any);

      const results = await coordinator.archiveItems([mockItem]);

      // Should try next service even when first throws
      expect(results[0].success).toBe(true);
      expect(mockService2.archive).toHaveBeenCalled();
    });

    it("should collect errors from all failed services", async function () {
      const mockService1 = {
        name: "Internet Archive",
        id: "internetarchive",
        archive: jest.fn().mockRejectedValue(new Error("IA threw")),
      };

      const mockService2 = {
        name: "Archive.today",
        id: "archivetoday",
        archive: jest.fn().mockRejectedValue(new Error("AT threw")),
      };

      mockRegistry.getAvailable.mockResolvedValue([
        { id: "internetarchive", service: mockService1 },
        { id: "archivetoday", service: mockService2 },
      ] as any);

      const results = await coordinator.archiveItems([mockItem]);

      // Should collect errors and include both in message
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("All archive services failed");
    });
  });
});
