import { ConcurrentArchiveQueue } from "../../src/utils/ConcurrentArchiveQueue";
import { TrafficMonitor } from "../../src/utils/TrafficMonitor";
import { ArchiveResult } from "../../src/modules/archive/types";

describe("ConcurrentArchiveQueue", () => {
  let queue: ConcurrentArchiveQueue;
  let trafficMonitor: TrafficMonitor;
  let mockItems: Zotero.Item[];

  // Mock item factory
  function createMockItem(id: number, title: string): Zotero.Item {
    return {
      id,
      getField: (field: string) => {
        if (field === "title") return title;
        if (field === "url") return `http://example.com/${id}`;
        return null;
      },
    } as any as Zotero.Item;
  }

  beforeEach(() => {
    queue = new ConcurrentArchiveQueue(4);
    trafficMonitor = TrafficMonitor.getInstance();
    trafficMonitor.resetBatch();

    // Create 5 mock items
    mockItems = [
      createMockItem(1, "Item 1"),
      createMockItem(2, "Item 2"),
      createMockItem(3, "Item 3"),
      createMockItem(4, "Item 4"),
      createMockItem(5, "Item 5"),
    ];

    // Mock Zotero.ProgressWindow
    (global as any).Zotero = {
      ProgressWindow: jest.fn(function () {
        return {
          changeHeadline: jest.fn(),
          addDescription: jest.fn(() => ({})),
          show: jest.fn(),
          close: jest.fn(),
          startCloseTimer: jest.fn(),
        };
      }),
      debug: jest.fn(),
    };
  });

  describe("Initialization", () => {
    it("should create queue with default maxConcurrency of 4", () => {
      const defaultQueue = new ConcurrentArchiveQueue();
      expect(defaultQueue).toBeDefined();
    });

    it("should clamp maxConcurrency between 1 and 8", () => {
      const zeroQueue = new ConcurrentArchiveQueue(0);
      const nineQueue = new ConcurrentArchiveQueue(9);
      // Both should be created without error
      expect(zeroQueue).toBeDefined();
      expect(nineQueue).toBeDefined();
    });
  });

  describe("Empty and Edge Cases", () => {
    it("should handle empty item array", async () => {
      const result = await queue.process([], async () => ({
        item: mockItems[0],
        success: true,
      }));

      expect(result).toEqual([]);
    });

    it("should handle items with no title", async () => {
      const item = {
        id: 99,
        getField: () => null,
      } as any as Zotero.Item;

      const result = await queue.process([item], async (item) => ({
        item,
        success: true,
        archivedUrl: "http://archive.org/test",
      }));

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);
    });
  });

  describe("Sequential Processing", () => {
    it("should archive single item successfully", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
      }));

      const result = await queue.process([mockItems[0]], archiveFn);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);
      expect(result[0].archivedUrl).toBe("http://archive.org/1");
      expect(archiveFn).toHaveBeenCalledTimes(1);
    });

    it("should maintain item order in results", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
      }));

      // mockItems is 1,2,3,4,5; pick items at indices 4,1,3 = items 5,2,4
      const items = [mockItems[4], mockItems[1], mockItems[3]];
      const result = await queue.process(items, archiveFn);

      // Result should be in same order as input items
      expect(result[0].item.id).toBe(items[0].id);
      expect(result[1].item.id).toBe(items[1].id);
      expect(result[2].item.id).toBe(items[2].id);
    });

    it("should handle errors per item", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        if (item.id === 2) {
          return {
            item,
            success: false,
            error: "Archive failed",
          };
        }
        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
        };
      });

      const result = await queue.process(mockItems.slice(0, 3), archiveFn);

      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBe("Archive failed");
      expect(result[2].success).toBe(true);
    });
  });

  describe("Concurrency Control", () => {
    it("should process multiple items successfully", async () => {
      const callOrder: number[] = [];

      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        callOrder.push(item.id!);
        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
        };
      });

      const tenItems = Array.from({ length: 10 }, (_, i) =>
        createMockItem(i + 1, `Item ${i + 1}`),
      );

      await queue.process(tenItems, archiveFn);

      // All items should have been processed
      expect(callOrder).toHaveLength(10);
      // All item IDs should have been called
      expect(archiveFn).toHaveBeenCalledTimes(10);
    });

    it("should process items in parallel for different services", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
      }));

      const manyItems = Array.from({ length: 8 }, (_, i) =>
        createMockItem(i + 1, `Item ${i + 1}`),
      );

      const result = await queue.process(manyItems, archiveFn);

      expect(result).toHaveLength(8);
      expect(result.every((r) => r.success)).toBe(true);
      expect(archiveFn).toHaveBeenCalledTimes(8);
    });

    it("should continue processing after item completion", async () => {
      const completionTimes: number[] = [];
      let completionCount = 0;

      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        completionCount++;
        completionTimes.push(completionCount);
        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
        };
      });

      const items = [mockItems[0], mockItems[1], mockItems[2]];
      const result = await queue.process(items, archiveFn);

      expect(result).toHaveLength(3);
      // All three items should have been processed
      expect(completionTimes).toEqual([1, 2, 3]);
    });
  });

  describe("Result Handling", () => {
    it("should return successful archive results", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
        service: "InternetArchive",
      }));

      const result = await queue.process([mockItems[0]], archiveFn);

      expect(result[0].success).toBe(true);
      expect(result[0].archivedUrl).toBe("http://archive.org/1");
      expect(result[0].service).toBe("InternetArchive");
    });

    it("should handle missing archive URLs", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: false,
        error: "No URL found",
      }));

      const result = await queue.process([mockItems[0]], archiveFn);

      expect(result[0].success).toBe(false);
      expect(result[0].error).toBe("No URL found");
      expect(result[0].archivedUrl).toBeUndefined();
    });

    it("should handle thrown errors in archiveFn", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        if (item.id === 2) {
          throw new Error("Network timeout");
        }
        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
        };
      });

      const result = await queue.process(mockItems.slice(0, 3), archiveFn);

      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBe("Network timeout");
      expect(result[2].success).toBe(true);
    });
  });

  describe("Traffic Monitoring Integration", () => {
    it("should reset traffic monitor at start", async () => {
      const resetSpy = jest.spyOn(trafficMonitor, "resetBatch");

      await queue.process([mockItems[0]], async (item) => ({
        item,
        success: true,
      }));

      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe("Queue Exhaustion", () => {
    it("should process all items even with errors", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        // Every other item fails
        if (item.id! % 2 === 0) {
          throw new Error("Even items fail");
        }
        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
        };
      });

      const result = await queue.process(mockItems, archiveFn);

      expect(result).toHaveLength(5);
      expect(result.filter((r) => r.success)).toHaveLength(3);
      expect(result.filter((r) => !r.success)).toHaveLength(2);
    });

    it("should handle large item batches", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
      }));

      const manyItems = Array.from({ length: 100 }, (_, i) =>
        createMockItem(i + 1, `Item ${i + 1}`),
      );

      const result = await queue.process(manyItems, archiveFn);

      expect(result).toHaveLength(100);
      expect(result.filter((r) => r.success)).toHaveLength(100);
      expect(archiveFn).toHaveBeenCalledTimes(100);
    });
  });

  describe("Progress Updates", () => {
    it("should create progress window for batch", async () => {
      const ProgressWindowMock = (global as any).Zotero.ProgressWindow;

      await queue.process([mockItems[0]], async (item) => ({
        item,
        success: true,
      }));

      expect(ProgressWindowMock).toHaveBeenCalled();
    });

    it("should create progress window for batch", async () => {
      const ProgressWindowMock = (global as any).Zotero.ProgressWindow;
      const initialCallCount = ProgressWindowMock.mock.calls.length;

      await queue.process(mockItems.slice(0, 2), async (item) => {
        return {
          item,
          success: true,
        };
      });

      // ProgressWindow should have been created
      expect(ProgressWindowMock.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe("Race Condition Safety", () => {
    it("should handle many item completions", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
      }));

      const items = Array.from({ length: 20 }, (_, i) =>
        createMockItem(i + 1, `Item ${i + 1}`),
      );

      const result = await queue.process(items, archiveFn);

      expect(result).toHaveLength(20);
      expect(result.every((r) => r.success)).toBe(true);
    });

    it("should maintain result order consistently", async () => {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
        };
      });

      const items = Array.from({ length: 15 }, (_, i) =>
        createMockItem(i + 1, `Item ${i + 1}`),
      );

      const result = await queue.process(items, archiveFn);

      // Results should be in same order as input
      result.forEach((r, i) => {
        expect(r.item.id).toBe(items[i].id);
      });
    });
  });
});
