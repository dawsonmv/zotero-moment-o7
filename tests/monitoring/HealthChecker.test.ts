/**
 * Tests for HealthChecker
 */

import { HealthChecker } from "../../src/modules/monitoring/HealthChecker";
import { MetricsRegistry } from "../../src/modules/monitoring/Metrics";
import { Logger } from "../../src/modules/monitoring/Logger";
import { HealthStatus } from "../../src/modules/monitoring/types";

// Mock dependencies
jest.mock("../../src/modules/monitoring/Metrics");
jest.mock("../../src/modules/monitoring/Logger");

describe("HealthChecker", function () {
  let healthChecker: HealthChecker;
  let mockMetrics: jest.Mocked<MetricsRegistry>;
  let mockLogger: any;

  beforeEach(function () {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton
    (HealthChecker as any).instance = undefined;

    // Mock MetricsRegistry
    mockMetrics = {
      getServiceMetrics: jest.fn().mockReturnValue({
        attempts: 10,
        successes: 9,
        failures: 1,
        successRate: 0.9,
        avgDuration: 5000,
        recentErrors: [],
      }),
      getSnapshot: jest.fn().mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.9,
        avgDuration: 5000,
      }),
    } as unknown as jest.Mocked<MetricsRegistry>;

    (MetricsRegistry.getInstance as jest.Mock).mockReturnValue(mockMetrics);

    // Mock Logger
    mockLogger = {
      child: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        notice: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
      }),
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    healthChecker = HealthChecker.getInstance();
  });

  afterEach(function () {
    healthChecker.stopPeriodicChecks();
    jest.useRealTimers();
  });

  describe("singleton pattern", function () {
    it("should return same instance", function () {
      const instance1 = HealthChecker.getInstance();
      const instance2 = HealthChecker.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("init", function () {
    it("should initialize service health for provided services", function () {
      healthChecker.init(["internetarchive", "archivetoday"]);

      const health = healthChecker.getAllHealth();
      expect(health).toHaveLength(2);
      expect(health.map((h) => h.serviceId)).toContain("internetarchive");
      expect(health.map((h) => h.serviceId)).toContain("archivetoday");
    });

    it("should set initial status to UNKNOWN", function () {
      healthChecker.init(["internetarchive"]);

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.status).toBe(HealthStatus.UNKNOWN);
    });

    it("should set initial success rate to 1", function () {
      healthChecker.init(["internetarchive"]);

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.successRate).toBe(1);
    });
  });

  describe("startPeriodicChecks", function () {
    it("should start periodic health checks", function () {
      healthChecker.init(["internetarchive"]);
      healthChecker.startPeriodicChecks();

      // Fast-forward past the check interval
      jest.advanceTimersByTime(300000);

      // Should have called getServiceMetrics
      expect(mockMetrics.getServiceMetrics).toHaveBeenCalled();
    });

    it("should not start multiple intervals", function () {
      healthChecker.init(["internetarchive"]);
      healthChecker.startPeriodicChecks();
      healthChecker.startPeriodicChecks();

      // Only one initial check should happen
      jest.advanceTimersByTime(300000);

      // Metrics should be called but not double the amount
      const callCount = mockMetrics.getServiceMetrics.mock.calls.length;
      jest.advanceTimersByTime(300000);

      // Should only increase by 1, not 2
      expect(mockMetrics.getServiceMetrics.mock.calls.length).toBe(
        callCount + 1,
      );
    });
  });

  describe("stopPeriodicChecks", function () {
    it("should stop periodic checks", function () {
      healthChecker.init(["internetarchive"]);
      healthChecker.startPeriodicChecks();
      healthChecker.stopPeriodicChecks();

      const callsBefore = mockMetrics.getServiceMetrics.mock.calls.length;
      jest.advanceTimersByTime(300000);

      // No new calls should be made
      expect(mockMetrics.getServiceMetrics.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("checkAllServices", function () {
    it("should update health for all services", function () {
      healthChecker.init(["internetarchive", "archivetoday"]);
      healthChecker.checkAllServices();

      expect(mockMetrics.getServiceMetrics).toHaveBeenCalledWith(
        "internetarchive",
      );
      expect(mockMetrics.getServiceMetrics).toHaveBeenCalledWith(
        "archivetoday",
      );
    });
  });

  describe("health status determination", function () {
    it("should set HEALTHY when success rate >= threshold", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 96,
        failures: 4,
        successRate: 0.96,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.status).toBe(HealthStatus.HEALTHY);
    });

    it("should set DEGRADED when success rate is between thresholds", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 80,
        failures: 20,
        successRate: 0.8,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.status).toBe(HealthStatus.DEGRADED);
    });

    it("should set UNHEALTHY when success rate is below threshold", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 50,
        failures: 50,
        successRate: 0.5,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.status).toBe(HealthStatus.UNHEALTHY);
    });

    it("should set DEGRADED when latency is high", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 98,
        failures: 2,
        successRate: 0.98,
        avgDuration: 35000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.status).toBe(HealthStatus.DEGRADED);
      expect(health?.message).toContain("latency");
    });

    it("should set UNKNOWN when no activity", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        avgDuration: 0,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health?.status).toBe(HealthStatus.UNKNOWN);
      expect(health?.message).toContain("No recent activity");
    });
  });

  describe("getServiceHealth", function () {
    it("should return undefined for non-existent service", function () {
      healthChecker.init(["internetarchive"]);
      expect(healthChecker.getServiceHealth("nonexistent")).toBeUndefined();
    });

    it("should return health for existing service", function () {
      healthChecker.init(["internetarchive"]);
      const health = healthChecker.getServiceHealth("internetarchive");
      expect(health).toBeDefined();
      expect(health?.serviceId).toBe("internetarchive");
    });
  });

  describe("getAllHealth", function () {
    it("should return all service health statuses", function () {
      healthChecker.init(["ia", "at", "perma"]);
      const allHealth = healthChecker.getAllHealth();
      expect(allHealth).toHaveLength(3);
    });
  });

  describe("getHealthyServices", function () {
    it("should return only healthy services", function () {
      mockMetrics.getServiceMetrics
        .mockReturnValueOnce({
          attempts: 100,
          successes: 98,
          failures: 2,
          successRate: 0.98,
          avgDuration: 5000,
          recentErrors: [],
        })
        .mockReturnValueOnce({
          attempts: 100,
          successes: 50,
          failures: 50,
          successRate: 0.5,
          avgDuration: 5000,
          recentErrors: [],
        });

      healthChecker.init(["healthy-service", "unhealthy-service"]);
      healthChecker.checkAllServices();

      const healthy = healthChecker.getHealthyServices();
      expect(healthy).toContain("healthy-service");
      expect(healthy).not.toContain("unhealthy-service");
    });
  });

  describe("getAvailableServices", function () {
    it("should return healthy and degraded services", function () {
      mockMetrics.getServiceMetrics
        .mockReturnValueOnce({
          attempts: 100,
          successes: 98,
          failures: 2,
          successRate: 0.98,
          avgDuration: 5000,
          recentErrors: [],
        })
        .mockReturnValueOnce({
          attempts: 100,
          successes: 80,
          failures: 20,
          successRate: 0.8,
          avgDuration: 5000,
          recentErrors: [],
        })
        .mockReturnValueOnce({
          attempts: 100,
          successes: 30,
          failures: 70,
          successRate: 0.3,
          avgDuration: 5000,
          recentErrors: [],
        });

      healthChecker.init(["healthy", "degraded", "unhealthy"]);
      healthChecker.checkAllServices();

      const available = healthChecker.getAvailableServices();
      expect(available).toContain("healthy");
      expect(available).toContain("degraded");
      expect(available).not.toContain("unhealthy");
    });
  });

  describe("isServiceAvailable", function () {
    it("should return true for healthy service", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 98,
        failures: 2,
        successRate: 0.98,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      expect(healthChecker.isServiceAvailable("internetarchive")).toBe(true);
    });

    it("should return true for degraded service", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 80,
        failures: 20,
        successRate: 0.8,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      expect(healthChecker.isServiceAvailable("internetarchive")).toBe(true);
    });

    it("should return true for unknown service", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        avgDuration: 0,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      expect(healthChecker.isServiceAvailable("internetarchive")).toBe(true);
    });

    it("should return false for unhealthy service", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 30,
        failures: 70,
        successRate: 0.3,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      expect(healthChecker.isServiceAvailable("internetarchive")).toBe(false);
    });

    it("should return false for non-existent service", function () {
      healthChecker.init(["internetarchive"]);
      expect(healthChecker.isServiceAvailable("nonexistent")).toBe(false);
    });
  });

  describe("getCircuitBreakers", function () {
    it("should return circuit breaker manager", function () {
      const breakers = healthChecker.getCircuitBreakers();
      expect(breakers).toBeDefined();
      expect(typeof breakers.getBreaker).toBe("function");
    });
  });

  describe("recordSuccess/recordFailure", function () {
    it("should update health on success", function () {
      healthChecker.init(["internetarchive"]);
      healthChecker.recordSuccess("internetarchive");

      // Should have updated metrics
      expect(mockMetrics.getServiceMetrics).toHaveBeenCalledWith(
        "internetarchive",
      );
    });

    it("should update health on failure", function () {
      healthChecker.init(["internetarchive"]);
      healthChecker.recordFailure("internetarchive", new Error("Test error"));

      // Should have updated metrics
      expect(mockMetrics.getServiceMetrics).toHaveBeenCalledWith(
        "internetarchive",
      );
    });
  });

  describe("getSystemHealth", function () {
    it("should return HEALTHY when all services healthy", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 98,
        failures: 2,
        successRate: 0.98,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["ia", "at"]);
      healthChecker.checkAllServices();

      const system = healthChecker.getSystemHealth();
      expect(system.status).toBe(HealthStatus.HEALTHY);
      expect(system.healthyCount).toBe(2);
      expect(system.unhealthyCount).toBe(0);
    });

    it("should return DEGRADED when some services degraded", function () {
      mockMetrics.getServiceMetrics
        .mockReturnValueOnce({
          attempts: 100,
          successes: 98,
          failures: 2,
          successRate: 0.98,
          avgDuration: 5000,
          recentErrors: [],
        })
        .mockReturnValueOnce({
          attempts: 100,
          successes: 80,
          failures: 20,
          successRate: 0.8,
          avgDuration: 5000,
          recentErrors: [],
        });

      healthChecker.init(["healthy", "degraded"]);
      healthChecker.checkAllServices();

      const system = healthChecker.getSystemHealth();
      expect(system.status).toBe(HealthStatus.DEGRADED);
    });

    it("should return UNHEALTHY when all services unhealthy", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 30,
        failures: 70,
        successRate: 0.3,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["ia", "at"]);
      healthChecker.checkAllServices();

      const system = healthChecker.getSystemHealth();
      expect(system.status).toBe(HealthStatus.UNHEALTHY);
      expect(system.unhealthyCount).toBe(2);
    });

    it("should return UNHEALTHY when no services initialized", function () {
      // When healths.length === 0, unhealthyCount === healths.length is true (0 === 0)
      const system = healthChecker.getSystemHealth();
      expect(system.status).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe("generateReport", function () {
    it("should generate text report", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 95,
        failures: 5,
        successRate: 0.95,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const report = healthChecker.generateReport();

      expect(report).toContain("Moment-o7 Health Report");
      expect(report).toContain("internetarchive");
      expect(report).toContain("Success Rate");
    });

    it("should include status icons", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 98,
        failures: 2,
        successRate: 0.98,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const report = healthChecker.generateReport();

      // Should contain healthy icon
      expect(report).toContain("✓");
    });

    it("should include message when present", function () {
      mockMetrics.getServiceMetrics.mockReturnValue({
        attempts: 100,
        successes: 30,
        failures: 70,
        successRate: 0.3,
        avgDuration: 5000,
        recentErrors: [],
      });

      healthChecker.init(["internetarchive"]);
      healthChecker.checkAllServices();

      const report = healthChecker.generateReport();

      expect(report).toContain("Note:");
      expect(report).toContain("success rate");
    });
  });
});
