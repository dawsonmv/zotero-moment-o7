import { TrafficMonitor } from "../../src/utils/TrafficMonitor";

describe("TrafficMonitor", function () {
  let monitor: TrafficMonitor;

  beforeEach(function () {
    jest.useFakeTimers();
    jest.clearAllTimers();
    monitor = TrafficMonitor.getInstance();
    monitor.resetBatch();
    (global as any).Zotero.debug = jest.fn();
  });

  afterEach(function () {
    jest.useRealTimers();
  });

  /**
   * Helper to simulate a complete request cycle
   * Accounts for 1-second delayed start
   */
  function simulateRequest(
    requestId: string,
    serviceId: string,
    durationMs: number,
    success = true,
  ): void {
    monitor.startRequest(requestId, serviceId, "http://example.com");
    jest.advanceTimersByTime(1000); // Trigger delayed start
    jest.advanceTimersByTime(durationMs); // Request duration
    monitor.endRequest(requestId, success);
  }

  describe("Singleton Pattern", function () {
    it("should return same instance on multiple calls", function () {
      const instance1 = TrafficMonitor.getInstance();
      const instance2 = TrafficMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("Score Calculation", function () {
    it("should calculate score as duration × 0.1", function () {
      simulateRequest("test_1", "internetarchive", 10000); // 10 seconds

      const mean = monitor.getMeanScore("internetarchive");
      expect(mean).toBeCloseTo(1.0, 0);
    });

    it("should handle very fast requests (< 1s) as 0 score", function () {
      monitor.startRequest("fast_1", "internetarchive", "http://example.com");
      // End immediately without advancing past 1 second delay
      monitor.endRequest("fast_1", true);

      const mean = monitor.getMeanScore("internetarchive");
      expect(mean).toBe(0);
    });

    it("should calculate ~2.0 score for 20+ second requests", function () {
      simulateRequest("slow_1", "internetarchive", 20000); // 20 seconds

      const mean = monitor.getMeanScore("internetarchive");
      expect(mean).toBeGreaterThanOrEqual(1.9);
    });
  });

  describe("Jamming Detection", function () {
    it("should mark service as jammed when score >= 2.0", function () {
      simulateRequest("jam_1", "archivetoday", 20000);

      expect(monitor.isServiceJammed("archivetoday")).toBe(true);
    });

    it("should not mark service as jammed when score < 2.0", function () {
      simulateRequest("ok_1", "permacc", 15000); // 1.5 score

      expect(monitor.isServiceJammed("permacc")).toBe(false);
    });

    it("should include service in getJammedServices()", function () {
      simulateRequest("jam_1", "internetarchive", 20000);
      simulateRequest("jam_2", "archivetoday", 20000);

      const jammed = monitor.getJammedServices();
      expect(jammed).toContain("internetarchive");
      expect(jammed).toContain("archivetoday");
      expect(jammed.length).toBe(2);
    });
  });

  describe("Mean Score Calculation", function () {
    it("should calculate mean of valid scores", function () {
      simulateRequest("score_1", "internetarchive", 10000); // 1.0
      simulateRequest("score_2", "internetarchive", 20000); // 2.0 (jams)
      simulateRequest("score_3", "internetarchive", 8000); // 0.8

      const mean = monitor.getMeanScore("internetarchive");
      // Mean ≈ (1.0 + 2.0 + 0.8) / 3 = 1.27
      expect(mean).toBeGreaterThan(1.2);
      expect(mean).toBeLessThan(1.4);
    });

    it("should return 0 for services with no scores", function () {
      const mean = monitor.getMeanScore("unknown-service");
      expect(mean).toBe(0);
    });
  });

  describe("Batch Reset", function () {
    it("should clear all state on resetBatch()", function () {
      simulateRequest("req_1", "internetarchive", 20000);

      expect(monitor.isServiceJammed("internetarchive")).toBe(true);
      expect(monitor.getMeanScore("internetarchive")).toBeGreaterThan(0);

      monitor.resetBatch();

      expect(monitor.isServiceJammed("internetarchive")).toBe(false);
      expect(monitor.getMeanScore("internetarchive")).toBe(0);
      expect(monitor.getJammedServices().length).toBe(0);
    });

    it("should allow reuse after reset", function () {
      // First batch
      simulateRequest("batch1_1", "internetarchive", 10000);
      const mean1 = monitor.getMeanScore("internetarchive");
      expect(mean1).toBeCloseTo(1.0, 0);

      // Reset
      monitor.resetBatch();

      // Second batch
      simulateRequest("batch2_1", "internetarchive", 5000);
      const mean2 = monitor.getMeanScore("internetarchive");
      expect(mean2).toBeCloseTo(0.5, 0);
    });
  });

  describe("Traffic Summary Formatting", function () {
    it("should format summary with service short names", function () {
      simulateRequest("req_1", "internetarchive", 10000);
      simulateRequest("req_2", "archivetoday", 8000);

      const summary = monitor.getTrafficSummary();
      expect(summary).toContain("IA:");
      expect(summary).toContain("AT:");
      expect(summary).toContain("|");
    });

    it("should include JAMMED status in summary", function () {
      simulateRequest("jammed_1", "internetarchive", 20000);

      const summary = monitor.getTrafficSummary();
      expect(summary).toContain("IA: JAMMED");
    });

    it("should return 'No traffic data' when no requests tracked", function () {
      const summary = monitor.getTrafficSummary();
      expect(summary).toBe("No traffic data");
    });
  });

  describe("Service Stats", function () {
    it("should calculate min, max, count for a service", function () {
      simulateRequest("stat_1", "permacc", 5000); // 0.5
      simulateRequest("stat_2", "permacc", 15000); // 1.5
      simulateRequest("stat_3", "permacc", 10000); // 1.0

      const stats = monitor.getServiceStats("permacc");
      expect(stats.count).toBe(3);
      expect(stats.min).toBeCloseTo(0.5, 0);
      expect(stats.max).toBeCloseTo(1.5, 0);
      expect(stats.isJammed).toBe(false);
    });

    it("should mark jammed status in stats", function () {
      simulateRequest("stat_jam", "permacc", 20000);

      const stats = monitor.getServiceStats("permacc");
      expect(stats.isJammed).toBe(true);
    });

    it("should return zero stats for unknown service", function () {
      const stats = monitor.getServiceStats("unknown");
      expect(stats.mean).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.count).toBe(0);
      expect(stats.isJammed).toBe(false);
    });
  });

  describe("Debug State Export", function () {
    it("should export debug state", function () {
      simulateRequest("debug_1", "internetarchive", 10000);
      simulateRequest("debug_2", "archivetoday", 20000);

      const debug = monitor.getDebugState();
      expect(debug.jammedCount).toBe(1);
      expect(debug.services.internetarchive).toBeDefined();
      expect(debug.services.archivetoday).toBeDefined();
      expect(debug.services.archivetoday.isJammed).toBe(true);
    });
  });

  describe("Multiple Services", function () {
    it("should track scores independently per service", function () {
      simulateRequest("multi_1", "internetarchive", 10000);
      simulateRequest("multi_2", "archivetoday", 5000);
      simulateRequest("multi_3", "permacc", 15000);

      const ia = monitor.getMeanScore("internetarchive");
      const at = monitor.getMeanScore("archivetoday");
      const pc = monitor.getMeanScore("permacc");

      expect(ia).toBeCloseTo(1.0, 0);
      expect(at).toBeCloseTo(0.5, 0);
      expect(pc).toBeCloseTo(1.5, 0);
    });

    it("should jam multiple services independently", function () {
      simulateRequest("jam_1", "internetarchive", 20000);
      simulateRequest("ok_1", "archivetoday", 10000);

      expect(monitor.isServiceJammed("internetarchive")).toBe(true);
      expect(monitor.isServiceJammed("archivetoday")).toBe(false);
    });
  });

  describe("Edge Cases", function () {
    it("should handle endRequest for unknown requestId", function () {
      expect(() => {
        monitor.endRequest("unknown_id", true);
      }).not.toThrow();

      const mean = monitor.getMeanScore("any_service");
      expect(mean).toBe(0);
    });

    it("should handle repeated resets", function () {
      for (let i = 0; i < 5; i++) {
        simulateRequest(`req_${i}`, "internetarchive", 10000);
        monitor.resetBatch();
        expect(monitor.getMeanScore("internetarchive")).toBe(0);
      }
    });

    it("should handle requests with varying durations", function () {
      for (let i = 0; i < 20; i++) {
        const duration = 5000 + Math.random() * 5000; // 5-10 seconds
        simulateRequest(`req_${i}`, "internetarchive", Math.floor(duration));
      }

      const stats = monitor.getServiceStats("internetarchive");
      expect(stats.count).toBe(20);
      expect(stats.mean).toBeGreaterThan(0.5);
      expect(stats.mean).toBeLessThan(1.0);
    });
  });
});
