/**
 * Tests for Dashboard
 */

import { Dashboard } from "../../src/modules/monitoring/Dashboard";
import { MetricsRegistry } from "../../src/modules/monitoring/Metrics";
import { Tracer } from "../../src/modules/monitoring/Tracer";
import { HealthChecker } from "../../src/modules/monitoring/HealthChecker";
import { AlertingManager } from "../../src/modules/monitoring/Alerting";
import { Logger } from "../../src/modules/monitoring/Logger";
import { HealthStatus } from "../../src/modules/monitoring/types";

// Mock dependencies
jest.mock("../../src/modules/monitoring/Metrics");
jest.mock("../../src/modules/monitoring/Tracer");
jest.mock("../../src/modules/monitoring/HealthChecker");
jest.mock("../../src/modules/monitoring/Alerting");
jest.mock("../../src/modules/monitoring/Logger");

describe("Dashboard", function () {
  let dashboard: Dashboard;
  let mockMetrics: jest.Mocked<MetricsRegistry>;
  let mockTracer: jest.Mocked<Tracer>;
  let mockHealthChecker: jest.Mocked<HealthChecker>;
  let mockAlerting: jest.Mocked<AlertingManager>;
  let mockLogger: any;

  beforeEach(function () {
    jest.clearAllMocks();

    // Reset singleton
    (Dashboard as any).instance = undefined;

    // Mock MetricsRegistry
    mockMetrics = {
      getSnapshot: jest.fn().mockReturnValue({
        archiveAttempts: 100,
        archiveSuccesses: 90,
        archiveFailures: 10,
        successRate: 0.9,
        avgDuration: 5000,
        p50Duration: 4000,
        p95Duration: 8000,
        activeOperations: 2,
        errorBreakdown: {
          "internetarchive:TIMEOUT": 5,
          "archivetoday:RATE_LIMIT": 3,
        },
      }),
      getRecentArchives: jest.fn().mockReturnValue([
        {
          serviceId: "internetarchive",
          url: "https://example.com",
          success: true,
          duration: 5000,
        },
      ]),
      getAggregatedStats: jest.fn().mockReturnValue({
        period: "day",
        startTime: Date.now() - 86400000,
        endTime: Date.now(),
        archiveAttempts: 100,
        archiveSuccesses: 90,
        archiveFailures: 10,
        serviceBreakdown: {
          internetarchive: {
            attempts: 60,
            successes: 55,
            failures: 5,
            avgLatency: 5000,
          },
          archivetoday: {
            attempts: 40,
            successes: 35,
            failures: 5,
            avgLatency: 8000,
          },
        },
        errorBreakdown: {
          TIMEOUT: 5,
          RATE_LIMIT: 3,
          BLOCKED: 2,
        },
        uniqueUrls: 80,
      }),
      export: jest.fn().mockReturnValue("{}"),
    } as unknown as jest.Mocked<MetricsRegistry>;
    (MetricsRegistry.getInstance as jest.Mock).mockReturnValue(mockMetrics);

    // Mock Tracer
    mockTracer = {
      getRecentTraces: jest.fn().mockReturnValue(["trace1", "trace2"]),
      export: jest.fn().mockReturnValue("[]"),
    } as unknown as jest.Mocked<Tracer>;
    (Tracer.getInstance as jest.Mock).mockReturnValue(mockTracer);

    // Mock HealthChecker
    mockHealthChecker = {
      getAllHealth: jest.fn().mockReturnValue([
        {
          serviceId: "internetarchive",
          status: HealthStatus.HEALTHY,
          successRate: 0.95,
          avgLatency: 5000,
          circuitState: "CLOSED",
        },
        {
          serviceId: "archivetoday",
          status: HealthStatus.DEGRADED,
          successRate: 0.85,
          avgLatency: 8000,
          circuitState: "CLOSED",
        },
      ]),
      getSystemHealth: jest.fn().mockReturnValue({
        status: HealthStatus.DEGRADED,
        healthyCount: 1,
        degradedCount: 1,
        unhealthyCount: 0,
      }),
    } as unknown as jest.Mocked<HealthChecker>;
    (HealthChecker.getInstance as jest.Mock).mockReturnValue(mockHealthChecker);

    // Mock AlertingManager
    mockAlerting = {
      getActiveAlerts: jest.fn().mockReturnValue([
        {
          ruleId: "test-alert",
          ruleName: "Test Alert",
          severity: "warning",
          timestamp: Date.now(),
          message: "Test alert message",
          context: {},
          resolved: false,
        },
      ]),
      getAllAlerts: jest.fn().mockReturnValue([
        {
          ruleId: "test-alert",
          ruleName: "Test Alert",
          severity: "warning",
          timestamp: Date.now(),
          message: "Test alert message",
          context: {},
          resolved: false,
        },
      ]),
    } as unknown as jest.Mocked<AlertingManager>;
    (AlertingManager.getInstance as jest.Mock).mockReturnValue(mockAlerting);

    // Mock Logger
    mockLogger = {
      export: jest.fn().mockReturnValue("[]"),
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    dashboard = Dashboard.getInstance();
  });

  describe("singleton pattern", function () {
    it("should return same instance", function () {
      const instance1 = Dashboard.getInstance();
      const instance2 = Dashboard.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("getDashboardData", function () {
    it("should aggregate all monitoring data", function () {
      const data = dashboard.getDashboardData();

      expect(data.timestamp).toBeDefined();
      expect(data.services).toBeDefined();
      expect(data.recentArchives).toBeDefined();
      expect(data.alerts).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.systemHealth).toBeDefined();
    });

    it("should include service health", function () {
      const data = dashboard.getDashboardData();

      expect(mockHealthChecker.getAllHealth).toHaveBeenCalled();
      expect(data.services).toHaveLength(2);
    });

    it("should include recent archives", function () {
      const data = dashboard.getDashboardData();

      expect(mockMetrics.getRecentArchives).toHaveBeenCalledWith(20);
      expect(data.recentArchives).toHaveLength(1);
    });

    it("should include active alerts", function () {
      const data = dashboard.getDashboardData();

      expect(mockAlerting.getActiveAlerts).toHaveBeenCalled();
      expect(data.alerts).toHaveLength(1);
    });

    it("should include system health info", function () {
      const data = dashboard.getDashboardData();

      expect(data.systemHealth.activeTraces).toBe(2);
      expect(data.systemHealth.pendingOperations).toBe(2);
    });
  });

  describe("generateReport", function () {
    it("should generate monitoring report", function () {
      const report = dashboard.generateReport();

      expect(report.generatedAt).toBeDefined();
      expect(report.reportPeriod).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.serviceDetails).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it("should use specified period", function () {
      const oneWeek = 604800000;
      dashboard.generateReport(oneWeek);

      expect(mockMetrics.getAggregatedStats).toHaveBeenCalledWith(oneWeek);
    });

    it("should calculate success rate", function () {
      const report = dashboard.generateReport();

      expect(report.summary.successRate).toBe(0.9); // 90/100
    });

    it("should identify most used service", function () {
      const report = dashboard.generateReport();

      expect(report.summary.mostUsedService).toBe("internetarchive"); // 60 attempts
    });

    it("should identify most common error", function () {
      const report = dashboard.generateReport();

      expect(report.summary.mostCommonError).toBe("TIMEOUT"); // 5 occurrences
    });
  });

  describe("generateRecommendations", function () {
    it("should recommend on low success rate", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.7, // Below 80%
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const report = dashboard.generateReport();

      expect(
        report.recommendations.some((r) => r.includes("success rate")),
      ).toBe(true);
    });

    it("should recommend on high latency", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.9,
        avgDuration: 35000, // Above 30s
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const report = dashboard.generateReport();

      expect(report.recommendations.some((r) => r.includes("30 seconds"))).toBe(
        true,
      );
    });

    it("should recommend on unhealthy services", function () {
      mockHealthChecker.getAllHealth.mockReturnValue([
        {
          serviceId: "internetarchive",
          status: HealthStatus.UNHEALTHY,
          successRate: 0.3,
          avgLatency: 5000,
          circuitState: "OPEN",
        } as any,
      ]);

      const report = dashboard.generateReport();

      expect(report.recommendations.some((r) => r.includes("unhealthy"))).toBe(
        true,
      );
    });

    it("should recommend on rate limiting", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {
          "internetarchive:RATE_LIMIT": 10,
        },
      } as any);

      const report = dashboard.generateReport();

      expect(
        report.recommendations.some((r) => r.includes("Rate limiting")),
      ).toBe(true);
    });

    it("should recommend on timeout errors", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {
          "internetarchive:TIMEOUT": 10,
        },
      } as any);

      const report = dashboard.generateReport();

      expect(report.recommendations.some((r) => r.includes("Timeout"))).toBe(
        true,
      );
    });

    it("should recommend on blocked URLs", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.9,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {
          "internetarchive:BLOCKED": 10,
        },
      } as any);

      const report = dashboard.generateReport();

      expect(report.recommendations.some((r) => r.includes("blocked"))).toBe(
        true,
      );
    });

    it("should recommend when no activity", function () {
      mockMetrics.getAggregatedStats.mockReturnValue({
        period: "day",
        startTime: Date.now() - 86400000,
        endTime: Date.now(),
        archiveAttempts: 0,
        archiveSuccesses: 0,
        archiveFailures: 0,
        serviceBreakdown: {},
        errorBreakdown: {},
        uniqueUrls: 0,
      });

      const report = dashboard.generateReport();

      expect(
        report.recommendations.some((r) => r.includes("No archive activity")),
      ).toBe(true);
    });

    it("should warn on Perma.cc quota approach", function () {
      mockMetrics.getAggregatedStats.mockReturnValue({
        period: "day",
        startTime: Date.now() - 86400000,
        endTime: Date.now(),
        archiveAttempts: 20,
        archiveSuccesses: 18,
        archiveFailures: 2,
        serviceBreakdown: {
          permacc: {
            attempts: 9, // Near 10/month limit
            successes: 8,
            failures: 1,
            avgLatency: 3000,
          },
        },
        errorBreakdown: {},
        uniqueUrls: 15,
      });

      const report = dashboard.generateReport();

      expect(report.recommendations.some((r) => r.includes("Perma.cc"))).toBe(
        true,
      );
    });
  });

  describe("getQuickStatus", function () {
    it("should return ok when healthy", function () {
      mockAlerting.getActiveAlerts.mockReturnValue([]);
      mockHealthChecker.getSystemHealth.mockReturnValue({
        status: HealthStatus.HEALTHY,
        healthyCount: 3,
        degradedCount: 0,
        unhealthyCount: 0,
        lastCheck: Date.now(),
      } as any);
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.95,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const status = dashboard.getQuickStatus();

      expect(status.status).toBe("ok");
      expect(status.message).toBe("All systems operational");
    });

    it("should return error on critical alerts", function () {
      mockAlerting.getActiveAlerts.mockReturnValue([
        {
          ruleId: "critical-alert",
          ruleName: "Critical",
          severity: "critical",
          timestamp: Date.now(),
          message: "Critical failure",
          context: {},
          resolved: false,
        },
      ]);

      const status = dashboard.getQuickStatus();

      expect(status.status).toBe("error");
      expect(status.details).toContain("Critical failure");
    });

    it("should return degraded on warnings", function () {
      mockAlerting.getActiveAlerts.mockReturnValue([
        {
          ruleId: "warning-alert",
          ruleName: "Warning",
          severity: "warning",
          timestamp: Date.now(),
          message: "Warning message",
          context: {},
          resolved: false,
        },
      ]);
      mockHealthChecker.getSystemHealth.mockReturnValue({
        status: HealthStatus.HEALTHY,
        healthyCount: 3,
        degradedCount: 0,
        unhealthyCount: 0,
        lastCheck: Date.now(),
      } as any);
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.95,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const status = dashboard.getQuickStatus();

      expect(status.status).toBe("degraded");
    });

    it("should return degraded on unhealthy services", function () {
      mockAlerting.getActiveAlerts.mockReturnValue([]);
      mockHealthChecker.getSystemHealth.mockReturnValue({
        status: HealthStatus.DEGRADED,
        healthyCount: 2,
        degradedCount: 0,
        unhealthyCount: 1,
        lastCheck: Date.now(),
      } as any);
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.95,
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const status = dashboard.getQuickStatus();

      expect(status.status).toBe("degraded");
      expect(status.details.some((d) => d.includes("Unhealthy"))).toBe(true);
    });

    it("should return error on high failure rate", function () {
      mockAlerting.getActiveAlerts.mockReturnValue([]);
      mockHealthChecker.getSystemHealth.mockReturnValue({
        status: HealthStatus.HEALTHY,
        healthyCount: 3,
        degradedCount: 0,
        unhealthyCount: 0,
        lastCheck: Date.now(),
      } as any);
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.4, // Below 50%
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const status = dashboard.getQuickStatus();

      expect(status.status).toBe("error");
      expect(status.message).toBe("High failure rate");
    });

    it("should return degraded on reduced success rate", function () {
      mockAlerting.getActiveAlerts.mockReturnValue([]);
      mockHealthChecker.getSystemHealth.mockReturnValue({
        status: HealthStatus.HEALTHY,
        healthyCount: 3,
        degradedCount: 0,
        unhealthyCount: 0,
        lastCheck: Date.now(),
      } as any);
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.7, // Between 50% and 80%
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const status = dashboard.getQuickStatus();

      expect(status.status).toBe("degraded");
      expect(status.message).toBe("Reduced success rate");
    });
  });

  describe("formatReportAsText", function () {
    it("should format report as readable text", function () {
      const report = dashboard.generateReport();
      const text = dashboard.formatReportAsText(report);

      expect(text).toContain("MOMENT-O7 MONITORING REPORT");
      expect(text).toContain("SUMMARY");
      expect(text).toContain("SERVICES");
    });

    it("should include summary stats", function () {
      const report = dashboard.generateReport();
      const text = dashboard.formatReportAsText(report);

      expect(text).toContain("Total Archives");
      expect(text).toContain("Success Rate");
      expect(text).toContain("Avg Latency");
    });

    it("should include status icons", function () {
      const report = dashboard.generateReport();
      const text = dashboard.formatReportAsText(report);

      // Should contain healthy or degraded icons
      expect(text).toMatch(/[✓⚠✗?]/);
    });

    it("should include alerts section when present", function () {
      const report = dashboard.generateReport();
      const text = dashboard.formatReportAsText(report);

      expect(text).toContain("ALERTS");
      expect(text).toContain("WARNING");
    });

    it("should include recommendations when present", function () {
      mockMetrics.getSnapshot.mockReturnValue({
        archiveAttempts: 100,
        successRate: 0.7, // Will trigger recommendation
        avgDuration: 5000,
        activeOperations: 0,
        errorBreakdown: {},
      } as any);

      const report = dashboard.generateReport();
      const text = dashboard.formatReportAsText(report);

      expect(text).toContain("RECOMMENDATIONS");
    });

    it("should truncate long alert lists", function () {
      mockAlerting.getAllAlerts.mockReturnValue(
        Array(15)
          .fill(null)
          .map((_, i) => ({
            ruleId: `alert-${i}`,
            ruleName: `Alert ${i}`,
            severity: "warning",
            timestamp: Date.now(),
            message: `Alert message ${i}`,
            context: {},
            resolved: false,
          })),
      );

      const report = dashboard.generateReport();
      const text = dashboard.formatReportAsText(report);

      expect(text).toContain("and 5 more");
    });
  });

  describe("exportAll", function () {
    it("should export all monitoring data as JSON", function () {
      const exported = dashboard.exportAll();
      const parsed = JSON.parse(exported);

      expect(parsed.dashboard).toBeDefined();
      expect(parsed.report).toBeDefined();
      expect(parsed.logs).toBeDefined();
      expect(parsed.traces).toBeDefined();
      expect(parsed.metrics).toBeDefined();
    });

    it("should call export on all components", function () {
      dashboard.exportAll();

      expect(mockLogger.export).toHaveBeenCalled();
      expect(mockTracer.export).toHaveBeenCalled();
      expect(mockMetrics.export).toHaveBeenCalled();
    });
  });
});
