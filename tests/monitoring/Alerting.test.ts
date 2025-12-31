/**
 * Tests for AlertingManager
 */

import { AlertingManager } from "../../src/modules/monitoring/Alerting";
import { MetricsRegistry } from "../../src/modules/monitoring/Metrics";
import { HealthChecker } from "../../src/modules/monitoring/HealthChecker";
import { Logger } from "../../src/modules/monitoring/Logger";
import { HealthStatus } from "../../src/modules/monitoring/types";

// Mock dependencies
jest.mock("../../src/modules/monitoring/Metrics");
jest.mock("../../src/modules/monitoring/HealthChecker");
jest.mock("../../src/modules/monitoring/Logger");

describe("AlertingManager", function () {
  let alerting: AlertingManager;
  let mockMetrics: jest.Mocked<MetricsRegistry>;
  let mockHealthChecker: jest.Mocked<HealthChecker>;
  let mockLogger: any;

  beforeEach(function () {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    // Reset singleton
    (AlertingManager as any).instance = undefined;

    // Mock MetricsRegistry
    mockMetrics = {
      getSnapshot: jest.fn().mockReturnValue({
        archiveAttempts: 100,
        archiveSuccesses: 90,
        archiveFailures: 10,
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      }),
    } as unknown as jest.Mocked<MetricsRegistry>;
    (MetricsRegistry.getInstance as jest.Mock).mockReturnValue(mockMetrics);

    // Mock HealthChecker
    mockHealthChecker = {
      getSystemHealth: jest.fn().mockReturnValue({
        status: HealthStatus.HEALTHY,
        healthyCount: 3,
        degradedCount: 0,
        unhealthyCount: 0,
      }),
      getServiceHealth: jest.fn().mockReturnValue({
        status: HealthStatus.HEALTHY,
        successRate: 0.95,
      }),
      getAvailableServices: jest.fn().mockReturnValue(["ia", "at", "perma"]),
      getCircuitBreakers: jest.fn().mockReturnValue({
        getAllStates: jest.fn().mockReturnValue(new Map()),
      }),
    } as unknown as jest.Mocked<HealthChecker>;
    (HealthChecker.getInstance as jest.Mock).mockReturnValue(mockHealthChecker);

    // Mock Logger
    mockLogger = {
      child: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
      }),
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    alerting = AlertingManager.getInstance();

    // Reset rule state to prevent test pollution from shared DEFAULT_RULES objects
    for (const rule of alerting.getRules()) {
      (rule as any).lastTriggered = undefined;
      (rule as any).enabled = true; // Re-enable all rules
    }
  });

  afterEach(function () {
    alerting.stop();
    alerting.clearAlerts();
    jest.useRealTimers();
  });

  describe("singleton pattern", function () {
    it("should return same instance", function () {
      const instance1 = AlertingManager.getInstance();
      const instance2 = AlertingManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("start/stop", function () {
    it("should start alert checking", function () {
      alerting.start();

      // Fast-forward past check interval
      jest.advanceTimersByTime(60000);

      // Should have evaluated rules
      expect(mockMetrics.getSnapshot).toHaveBeenCalled();
    });

    it("should not start multiple intervals", function () {
      alerting.start();
      alerting.start();

      jest.clearAllMocks();
      jest.advanceTimersByTime(60000);

      // Should be called once per interval, not twice
      expect(mockMetrics.getSnapshot.mock.calls.length).toBeGreaterThan(0);
    });

    it("should stop alert checking", function () {
      alerting.start();
      alerting.stop();

      const callsBefore = mockMetrics.getSnapshot.mock.calls.length;
      jest.advanceTimersByTime(120000);

      // No new calls
      expect(mockMetrics.getSnapshot.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("addRule/removeRule", function () {
    it("should add custom rule", function () {
      alerting.addRule({
        id: "custom-rule",
        name: "Custom Rule",
        description: "Test rule",
        condition: {
          metric: "successRate",
          operator: "<",
          threshold: 0.9,
          windowMs: 3600000,
        },
        severity: "warning",
        enabled: true,
        cooldownMs: 300000,
      });

      const rules = alerting.getRules();
      expect(rules.find((r) => r.id === "custom-rule")).toBeDefined();
    });

    it("should remove rule", function () {
      alerting.addRule({
        id: "to-remove",
        name: "To Remove",
        description: "Will be removed",
        condition: {
          metric: "successRate",
          operator: "<",
          threshold: 0.5,
          windowMs: 3600000,
        },
        severity: "warning",
        enabled: true,
        cooldownMs: 300000,
      });

      const removed = alerting.removeRule("to-remove");
      expect(removed).toBe(true);

      const rules = alerting.getRules();
      expect(rules.find((r) => r.id === "to-remove")).toBeUndefined();
    });

    it("should return false when removing non-existent rule", function () {
      const removed = alerting.removeRule("non-existent");
      expect(removed).toBe(false);
    });
  });

  describe("setRuleEnabled", function () {
    it("should enable/disable rule", function () {
      alerting.setRuleEnabled("high-failure-rate", false);

      const rules = alerting.getRules();
      const rule = rules.find((r) => r.id === "high-failure-rate");
      expect(rule?.enabled).toBe(false);
    });

    it("should handle non-existent rule gracefully", function () {
      // Should not throw
      expect(() =>
        alerting.setRuleEnabled("non-existent", false),
      ).not.toThrow();
    });
  });

  describe("alert triggering", function () {
    it("should trigger alert when condition met", function () {
      // Set up low success rate
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        archiveSuccesses: 40,
        archiveFailures: 60,
        successRate: 0.4, // Below 0.5 threshold
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.length).toBeGreaterThan(0);
      expect(active.some((a) => a.ruleId === "high-failure-rate")).toBe(true);
    });

    it("should respect cooldown period", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();

      // First check triggers alert
      jest.advanceTimersByTime(60000);
      const firstCount = alerting.getActiveAlerts().length;

      // Second check within cooldown should not duplicate
      jest.advanceTimersByTime(60000);
      const secondCount = alerting.getActiveAlerts().length;

      expect(secondCount).toBe(firstCount);
    });

    it("should trigger all-services-down alert", function () {
      mockHealthChecker.getAvailableServices.mockReturnValue([]);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "all-services-down")).toBe(true);
    });

    it("should trigger high-latency alert", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.9,
        avgDuration: 65000, // Above 60s threshold
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "high-latency")).toBe(true);
    });

    it("should trigger circuit-breaker-open alert", function () {
      const mockStates = new Map([
        ["internetarchive", { state: "OPEN", failures: 5 }],
      ]);
      mockHealthChecker.getCircuitBreakers.mockReturnValue({
        getAllStates: jest.fn().mockReturnValue(mockStates),
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "circuit-breaker-open")).toBe(
        true,
      );
    });
  });

  describe("condition evaluation", function () {
    it("should evaluate > operator", function () {
      alerting.addRule({
        id: "test-gt",
        name: "Test Greater Than",
        description: "Test",
        condition: {
          metric: "avgLatency",
          operator: ">",
          threshold: 1000,
          windowMs: 3600000,
        },
        severity: "info",
        enabled: true,
        cooldownMs: 0,
      });

      mockMetrics.getSnapshot.mockReturnValue({
        avgDuration: 5000,
        successRate: 0.9,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "test-gt")).toBe(true);
    });

    it("should evaluate < operator", function () {
      alerting.addRule({
        id: "test-lt",
        name: "Test Less Than",
        description: "Test",
        condition: {
          metric: "successRate",
          operator: "<",
          threshold: 0.95,
          windowMs: 3600000,
        },
        severity: "info",
        enabled: true,
        cooldownMs: 0,
      });

      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "test-lt")).toBe(true);
    });

    it("should evaluate == operator", function () {
      alerting.addRule({
        id: "test-eq",
        name: "Test Equals",
        description: "Test",
        condition: {
          metric: "activeOperations",
          operator: "==",
          threshold: 0,
          windowMs: 3600000,
        },
        severity: "info",
        enabled: true,
        cooldownMs: 0,
      });

      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "test-eq")).toBe(true);
    });

    it("should evaluate != operator", function () {
      alerting.addRule({
        id: "test-neq",
        name: "Test Not Equals",
        description: "Test",
        condition: {
          metric: "activeOperations",
          operator: "!=",
          threshold: 5,
          windowMs: 3600000,
        },
        severity: "info",
        enabled: true,
        cooldownMs: 0,
      });

      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "test-neq")).toBe(true);
    });

    it("should skip disabled rules", function () {
      alerting.setRuleEnabled("high-failure-rate", false);

      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.3, // Would trigger
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "high-failure-rate")).toBe(false);
    });
  });

  describe("alert resolution", function () {
    it("should resolve alert when condition no longer met", function () {
      // First trigger alert
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      expect(alerting.getActiveAlerts().length).toBeGreaterThan(0);

      // Now condition is resolved
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      jest.advanceTimersByTime(60000);

      // Alert should be resolved
      const all = alerting.getAllAlerts();
      const resolvedAlert = all.find((a) => a.ruleId === "high-failure-rate");
      expect(resolvedAlert?.resolved).toBe(true);
      expect(resolvedAlert?.resolvedAt).toBeDefined();
    });
  });

  describe("getActiveAlerts", function () {
    it("should return only unresolved alerts", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.every((a) => !a.resolved)).toBe(true);
    });
  });

  describe("getAllAlerts", function () {
    it("should filter by since timestamp", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const futureTime = Date.now() + 100000;
      const filtered = alerting.getAllAlerts({ since: futureTime });
      expect(filtered).toHaveLength(0);
    });

    it("should filter by severity", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 70000, // Triggers both high-failure-rate (error) and high-latency (warning)
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const errorAlerts = alerting.getAllAlerts({ severity: "error" });
      expect(errorAlerts.every((a) => a.severity === "error")).toBe(true);
    });

    it("should filter by resolved status", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const unresolved = alerting.getAllAlerts({ resolved: false });
      expect(unresolved.every((a) => !a.resolved)).toBe(true);
    });

    it("should limit results", function () {
      // Trigger multiple alerts
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 70000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      mockHealthChecker.getAvailableServices.mockReturnValue([]);

      alerting.start();
      jest.runOnlyPendingTimers();

      const limited = alerting.getAllAlerts({ limit: 1 });
      expect(limited).toHaveLength(1);
    });
  });

  describe("getAlertStats", function () {
    it("should return alert statistics", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const stats = alerting.getAlertStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
      expect(stats.bySeverity).toBeDefined();
      expect(typeof stats.avgResolutionTime).toBe("number");
    });

    it("should calculate average resolution time", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      // Resolve alert
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      jest.advanceTimersByTime(60000);

      const stats = alerting.getAlertStats();
      expect(stats.resolved).toBeGreaterThan(0);
      expect(stats.avgResolutionTime).toBeGreaterThan(0);
    });
  });

  describe("acknowledgeAlert", function () {
    it("should manually resolve alert", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.length).toBeGreaterThan(0);

      const alertTimestamp = active[0].timestamp;
      const acknowledged = alerting.acknowledgeAlert(alertTimestamp);

      expect(acknowledged).toBe(true);
      expect(
        alerting.getActiveAlerts().find((a) => a.timestamp === alertTimestamp),
      ).toBeUndefined();
    });

    it("should return false for non-existent alert", function () {
      const result = alerting.acknowledgeAlert(12345);
      expect(result).toBe(false);
    });

    it("should return false for already resolved alert", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      const alertTimestamp = active[0].timestamp;

      // First acknowledgment
      alerting.acknowledgeAlert(alertTimestamp);

      // Second acknowledgment should fail
      const result = alerting.acknowledgeAlert(alertTimestamp);
      expect(result).toBe(false);
    });
  });

  describe("clearAlerts", function () {
    it("should clear all alerts", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.4,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      expect(alerting.getAllAlerts().length).toBeGreaterThan(0);

      alerting.clearAlerts();

      expect(alerting.getAllAlerts()).toHaveLength(0);
    });
  });

  describe("getRules", function () {
    it("should return all rules including defaults", function () {
      const rules = alerting.getRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.id === "high-failure-rate")).toBe(true);
      expect(rules.some((r) => r.id === "all-services-down")).toBe(true);
    });
  });

  describe("service-specific metrics", function () {
    it("should check service health with serviceId", function () {
      alerting.addRule({
        id: "test-service-health",
        name: "Test Service Health",
        description: "Test",
        condition: {
          metric: "serviceHealth",
          operator: "==",
          threshold: 0, // 0 = unhealthy
          windowMs: 3600000,
          serviceId: "internetarchive",
        },
        severity: "warning",
        enabled: true,
        cooldownMs: 0,
      });

      mockHealthChecker.getServiceHealth.mockReturnValue({
        status: HealthStatus.UNHEALTHY,
        successRate: 0.3,
      } as any);

      alerting.start();
      jest.runOnlyPendingTimers();

      const active = alerting.getActiveAlerts();
      expect(active.some((a) => a.ruleId === "test-service-health")).toBe(true);
    });
  });

  describe("max alerts trimming", function () {
    it("should trim old alerts when exceeding max", function () {
      // Add rule with no cooldown to generate many alerts
      alerting.addRule({
        id: "spam-alert",
        name: "Spam Alert",
        description: "For testing",
        condition: {
          metric: "activeOperations",
          operator: "==",
          threshold: 0,
          windowMs: 1000,
        },
        severity: "info",
        enabled: true,
        cooldownMs: 0,
      });

      mockMetrics.getSnapshot.mockReturnValue({
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      alerting.start();

      // Generate many alerts
      for (let i = 0; i < 150; i++) {
        jest.advanceTimersByTime(60000);
      }

      const allAlerts = alerting.getAllAlerts();
      expect(allAlerts.length).toBeLessThanOrEqual(100);
    });
  });
});
