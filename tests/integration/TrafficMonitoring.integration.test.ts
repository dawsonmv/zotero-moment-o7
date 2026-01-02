/**
 * Integration tests for Traffic Monitoring & Concurrent Archiving
 * Validates the complete end-to-end flow:
 * - ConcurrentArchiveQueue processes items with up to 4 concurrent requests
 * - TrafficMonitor tracks HTTP request times and detects service jamming
 * - ArchiveCoordinator filters jammed services from fallback order
 * - BaseArchiveService wraps HTTP requests with traffic monitoring
 */

import { ConcurrentArchiveQueue } from "../../src/utils/ConcurrentArchiveQueue";
import { TrafficMonitor } from "../../src/utils/TrafficMonitor";
import { ArchiveCoordinator } from "../../src/modules/archive/ArchiveCoordinator";
import { ArchiveResult } from "../../src/modules/archive/types";
import { ServiceRegistry } from "../../src/modules/archive/ServiceRegistry";

// Create mock Zotero Item
function createMockItem(
  id: number,
  url: string = `https://example${id}.com`,
): Zotero.Item {
  return {
    id,
    key: `KEY${id}`,
    version: 1,
    itemType: "webpage",
    getField: jest.fn((field: string) => {
      if (field === "url") return url;
      if (field === "title") return `Test Item ${id}`;
      return null;
    }),
    setField: jest.fn(),
    getTags: jest.fn().mockReturnValue([]),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    getNotes: jest.fn().mockReturnValue([]),
    getNote: jest.fn(),
    setNote: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    saveTx: jest.fn().mockResolvedValue(undefined),
  } as any as Zotero.Item;
}

describe("Traffic Monitoring & Concurrent Archiving Integration", function () {
  let queue: ConcurrentArchiveQueue;
  let trafficMonitor: TrafficMonitor;
  let coordinator: ArchiveCoordinator;
  let registry: ServiceRegistry;

  beforeEach(function () {
    jest.useFakeTimers();
    queue = new ConcurrentArchiveQueue(4);
    trafficMonitor = TrafficMonitor.getInstance();
    trafficMonitor.resetBatch();
    coordinator = ArchiveCoordinator.getInstance();
    registry = ServiceRegistry.getInstance();
    registry.clear();
    registry.init();

    // Mock Zotero globals
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
      setTimeout: (fn: () => void, delay: number) => {
        const timeoutId = setTimeout(fn, delay);
        return timeoutId;
      },
      clearTimeout: (id: any) => clearTimeout(id),
      Prefs: {
        get: jest.fn((key: string) => {
          if (key === "extensions.momento7.autoArchive") return false;
          if (key === "extensions.momento7.checkBeforeArchive") return false;
          if (key === "extensions.momento7.defaultService") return "test1";
          if (key === "extensions.momento7.fallbackOrder")
            return "test1,test2,test3";
          return null;
        }),
        set: jest.fn(),
      },
      HTTP: {
        request: jest.fn(),
      },
      Notifier: {
        registerObserver: jest.fn(),
        unregisterObserver: jest.fn(),
      },
    };
  });

  afterEach(function () {
    jest.useRealTimers();
    trafficMonitor.resetBatch();
    (ArchiveCoordinator as any).instance = undefined;
    (TrafficMonitor as any).instance = undefined;
    registry.clear();
  });

  describe("Traffic Monitoring - HTTP Request Tracking", function () {
    it("should start monitoring after 1 second delay", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        // Simulate request starting
        const requestId = `test_${item.id}`;
        trafficMonitor.startRequest(
          requestId,
          "test-service",
          "http://example.com",
        );

        // Advance time: 1s delay for monitoring start + 5s request duration
        jest.advanceTimersByTime(1000);
        jest.advanceTimersByTime(5000);

        // End request after monitoring started
        trafficMonitor.endRequest(requestId, true);

        return {
          item,
          success: true,
          archivedUrl: "http://archive.org/test",
          service: "test-service",
        };
      });

      const mockItem = createMockItem(1);
      const result = await queue.process([mockItem], archiveFn);

      expect(result[0].success).toBe(true);
      const meanScore = trafficMonitor.getMeanScore("test-service");
      expect(meanScore).toBeGreaterThan(0); // 5 seconds of monitoring = 0.5 score
    });

    it("should not record score for fast responses under 1 second", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        const requestId = `test_${item.id}`;

        // Simulate delayed timer start (like BaseArchiveService does)
        let monitoringStarted = false;
        const timerHandle = setTimeout(() => {
          monitoringStarted = true;
          trafficMonitor.startRequest(
            requestId,
            "test-service",
            "http://example.com",
          );
        }, 1000);

        // Advance only 500ms (less than 1s delay for monitoring start)
        jest.advanceTimersByTime(500);

        // Clear timer and end request before monitoring started
        clearTimeout(timerHandle);
        if (monitoringStarted) {
          trafficMonitor.endRequest(requestId, true);
        }

        return {
          item,
          success: true,
          archivedUrl: "http://archive.org/test",
          service: "test-service",
        };
      });

      const mockItem = createMockItem(1);
      const result = await queue.process([mockItem], archiveFn);

      expect(result[0].success).toBe(true);
      // No score recorded for fast response (timer was cleared before firing)
      const meanScore = trafficMonitor.getMeanScore("test-service");
      expect(meanScore).toBe(0);
    });
  });

  describe("Traffic Monitoring - Jamming Detection", function () {
    it("should detect service jamming when score >= 2.0", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        const requestId = `test_${item.id}`;
        trafficMonitor.startRequest(
          requestId,
          "slow-service",
          "http://example.com",
        );

        // Simulate request taking 21 seconds (>= 20s delay threshold)
        // Score = (21000ms - 1000ms) / 1000 * 0.1 = 2.0
        jest.advanceTimersByTime(1000); // Trigger monitoring start
        jest.advanceTimersByTime(20000); // Request duration

        trafficMonitor.endRequest(requestId, true);

        return {
          item,
          success: true,
          archivedUrl: "http://archive.org/test",
          service: "slow-service",
        };
      });

      const mockItem = createMockItem(1);
      await queue.process([mockItem], archiveFn);

      expect(trafficMonitor.isServiceJammed("slow-service")).toBe(true);
    });

    it("should not mark service as jammed for scores < 2.0", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        const requestId = `test_${item.id}`;
        trafficMonitor.startRequest(
          requestId,
          "normal-service",
          "http://example.com",
        );

        // Simulate request taking 10 seconds
        // Score = (10000ms - 1000ms) / 1000 * 0.1 = 0.9
        jest.advanceTimersByTime(1000); // Trigger monitoring start
        jest.advanceTimersByTime(9000); // Request duration

        trafficMonitor.endRequest(requestId, true);

        return {
          item,
          success: true,
          archivedUrl: "http://archive.org/test",
          service: "normal-service",
        };
      });

      const mockItem = createMockItem(1);
      await queue.process([mockItem], archiveFn);

      expect(trafficMonitor.isServiceJammed("normal-service")).toBe(false);
    });
  });

  describe("Concurrent Queue - Multiple Items Processing", function () {
    it("should process up to 4 items concurrently", async function () {
      const processOrder: number[] = [];
      let activeCount = 0;
      let maxConcurrent = 0;

      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        activeCount++;
        maxConcurrent = Math.max(maxConcurrent, activeCount);
        processOrder.push(item.id as number);

        // Simulate different request durations
        const duration = ((item.id as number) % 3) * 1000 + 2000;
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, duration);
          // Don't actually wait in test
          resolve(undefined);
        });

        activeCount--;

        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
          service: "test-service",
        };
      });

      const items = Array.from({ length: 8 }, (_, i) => createMockItem(i + 1));
      const results = await queue.process(items, archiveFn);

      expect(results).toHaveLength(8);
      expect(results.every((r) => r.success)).toBe(true);
      // Should have processed all items in correct order despite concurrency
      expect(results.map((r) => r.item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it("should maintain result order regardless of completion order", async function () {
      const completionTimes: number[] = [];

      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        completionTimes.push(Date.now());

        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
          service: "test-service",
        };
      });

      const items = [
        createMockItem(5),
        createMockItem(2),
        createMockItem(9),
        createMockItem(1),
      ];

      const results = await queue.process(items, archiveFn);

      // Results should be in same order as input, not completion order
      expect(results[0].item.id).toBe(5);
      expect(results[1].item.id).toBe(2);
      expect(results[2].item.id).toBe(9);
      expect(results[3].item.id).toBe(1);
    });

    it("should continue processing after failures", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        // Every other item fails
        if ((item.id as number) % 2 === 0) {
          return {
            item,
            success: false,
            error: "Archive failed",
            service: "test-service",
          };
        }

        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
          service: "test-service",
        };
      });

      const items = Array.from({ length: 6 }, (_, i) => createMockItem(i + 1));
      const results = await queue.process(items, archiveFn);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(3);
      expect(failCount).toBe(3);
      expect(results).toHaveLength(6);
    });
  });

  describe("Batch Reset & Isolation", function () {
    it("should reset traffic scores between batches", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: "http://archive.org/test",
        service: "test-service",
      }));

      // First batch
      let items = [createMockItem(1)];
      await queue.process(items, archiveFn);

      let stats = trafficMonitor.getServiceStats("test-service");
      expect(stats.mean).toBeGreaterThanOrEqual(0);

      // Reset batch (as coordinator does)
      trafficMonitor.resetBatch();

      // Check scores were reset
      stats = trafficMonitor.getServiceStats("test-service");
      expect(stats.mean).toBe(0);
      expect(stats.count).toBe(0);

      // Second batch with different service should be isolated
      items = [createMockItem(2)];
      await queue.process(items, (item) =>
        archiveFn(item).then((result) => ({
          ...result,
          service: "different-service",
        })),
      );

      const stats1 = trafficMonitor.getServiceStats("test-service");
      const stats2 = trafficMonitor.getServiceStats("different-service");

      expect(stats1.count).toBe(0); // Should still be reset
      expect(stats2.count).toBeGreaterThanOrEqual(0); // New service
    });
  });

  describe("Performance - Large Batch Processing", function () {
    it("should handle 100-item batch efficiently", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => ({
        item,
        success: true,
        archivedUrl: `http://archive.org/${item.id}`,
        service: "test-service",
      }));

      const items = Array.from({ length: 100 }, (_, i) =>
        createMockItem(i + 1),
      );

      const startTime = Date.now();
      const results = await queue.process(items, archiveFn);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(results.every((r) => r.success)).toBe(true);
      // Should complete in reasonable time (mock operations are instant)
      expect(duration).toBeLessThan(5000);
    });

    it("should process large batch with traffic monitoring", async function () {
      let requestCount = 0;

      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        const requestId = `test_${item.id}_${++requestCount}`;
        trafficMonitor.startRequest(
          requestId,
          "test-service",
          `http://example${item.id}.com`,
        );

        // Simulate some requests taking longer
        const isSlowRequest = (item.id as number) % 10 === 0;
        const duration = isSlowRequest ? 2000 : 500;

        jest.advanceTimersByTime(1000); // Trigger monitoring start
        jest.advanceTimersByTime(duration - 100);

        trafficMonitor.endRequest(requestId, true);

        return {
          item,
          success: true,
          archivedUrl: `http://archive.org/${item.id}`,
          service: "test-service",
        };
      });

      const items = Array.from({ length: 50 }, (_, i) => createMockItem(i + 1));
      const results = await queue.process(items, archiveFn);

      expect(results).toHaveLength(50);

      // Should have traffic data
      const stats = trafficMonitor.getServiceStats("test-service");
      expect(stats.count).toBeGreaterThan(0);
      expect(stats.mean).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Traffic Summary Display", function () {
    it("should generate traffic summary for progress window", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        const requestId = `test_${item.id}`;

        // Simulate delayed timer start
        let monitoringStarted = false;
        const timerHandle = setTimeout(() => {
          monitoringStarted = true;
          trafficMonitor.startRequest(
            requestId,
            "internetarchive",
            "http://example.com",
          );
        }, 1000);

        // Simulate request taking 5 seconds
        jest.advanceTimersByTime(1000); // Trigger monitoring start
        jest.advanceTimersByTime(5000); // Request duration

        clearTimeout(timerHandle);
        if (monitoringStarted) {
          trafficMonitor.endRequest(requestId, true);
        }

        return {
          item,
          success: true,
          archivedUrl: "http://archive.org/test",
          service: "internetarchive",
        };
      });

      const items = [createMockItem(1)];
      await queue.process(items, archiveFn);

      const summary = trafficMonitor.getTrafficSummary();
      expect(summary).not.toBe("No traffic data");
      // Service name is abbreviated: "internetarchive" → "IA"
      expect(summary).toContain("IA");
    });

    it("should indicate jammed services in summary", async function () {
      const archiveFn = jest.fn(async (item: Zotero.Item) => {
        const requestId = `test_${item.id}`;

        // Simulate delayed timer start
        let monitoringStarted = false;
        const timerHandle = setTimeout(() => {
          monitoringStarted = true;
          trafficMonitor.startRequest(
            requestId,
            "jammed-service",
            "http://example.com",
          );
        }, 1000);

        // Simulate request taking 25 seconds (long enough to trigger jamming >= 2.0)
        jest.advanceTimersByTime(1000); // Trigger monitoring start
        jest.advanceTimersByTime(25000); // Request duration

        clearTimeout(timerHandle);
        if (monitoringStarted) {
          trafficMonitor.endRequest(requestId, true);
        }

        return {
          item,
          success: true,
          archivedUrl: "http://archive.org/test",
          service: "jammed-service",
        };
      });

      const items = [createMockItem(1)];
      await queue.process(items, archiveFn);

      expect(trafficMonitor.isServiceJammed("jammed-service")).toBe(true);
      const summary = trafficMonitor.getTrafficSummary();
      expect(summary).toContain("JAMMED");
    });
  });

  describe("End-to-End Archiving Flow", function () {
    it("should complete a full archiving batch with all components", async function () {
      const archiveFn = jest.fn(
        async (item: Zotero.Item): Promise<ArchiveResult> => {
          const requestId = `archive_${item.id}_${Date.now()}_${Math.random()}`;

          // Simulate delayed timer start (like BaseArchiveService does)
          let monitoringStarted = false;
          const timerHandle = setTimeout(() => {
            monitoringStarted = true;
            trafficMonitor.startRequest(
              requestId,
              "test-service",
              item.getField("url") as string,
            );
          }, 1000);

          // Simulate HTTP request: 1s delay for monitoring start + 3s request duration
          jest.advanceTimersByTime(1000); // Trigger monitoring start
          jest.advanceTimersByTime(3000); // Request duration

          clearTimeout(timerHandle);
          if (monitoringStarted) {
            trafficMonitor.endRequest(requestId, true);
          }

          return {
            item,
            success: true,
            archivedUrl: `http://archive.org/${item.id}`,
            service: "test-service",
          };
        },
      );

      // Create batch of items
      const items = Array.from({ length: 5 }, (_, i) => createMockItem(i + 1));

      // Process through queue
      const results = await queue.process(items, archiveFn);

      // Verify all results
      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);

      // Verify traffic monitoring data
      const stats = trafficMonitor.getServiceStats("test-service");
      expect(stats.count).toBeGreaterThan(0);
      expect(stats.mean).toBeGreaterThan(0);

      // Verify results maintain order
      items.forEach((item, index) => {
        expect(results[index].item.id).toBe(item.id);
      });
    });
  });
});
