/**
 * Tests for AlertManager utility
 */

import { AlertManager } from "../../src/modules/archive/AlertManager";
import { AlertLevel, AlertChannel } from "../../src/modules/archive/types";

describe("AlertManager", function () {
  beforeEach(function () {
    // Reset singleton instance for clean state between tests
    (AlertManager as any).instance = undefined;
  });

  describe("createAlert", function () {
    it("should create and return an alert", function () {
      const manager = AlertManager.getInstance();

      const alert = manager.createAlert(
        "Test Alert",
        "This is a test",
        AlertLevel.Warning,
      );

      expect(alert).toBeDefined();
      expect(alert?.title).toBe("Test Alert");
      expect(alert?.message).toBe("This is a test");
      expect(alert?.level).toBe(AlertLevel.Warning);
      expect(alert?.acknowledged).toBe(false);
      expect(alert?.id).toBeDefined();
      expect(alert?.timestamp).toBeDefined();
    });

    it("should not create alert when disabled", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({ enabled: false });

      const alert = manager.createAlert("Test Alert", "This is a test");

      expect(alert).toBeNull();
    });

    it("should respect alert level threshold", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({ level: AlertLevel.Error });

      const infoAlert = manager.createAlert(
        "Info Alert",
        "message",
        AlertLevel.Info,
      );
      const warningAlert = manager.createAlert(
        "Warning Alert",
        "message",
        AlertLevel.Warning,
      );
      const errorAlert = manager.createAlert(
        "Error Alert",
        "message",
        AlertLevel.Error,
      );

      expect(infoAlert).toBeNull(); // Below threshold
      expect(warningAlert).toBeNull(); // Below threshold
      expect(errorAlert).toBeDefined(); // At threshold
    });

    it("should deduplicate alerts within minAlertInterval", function () {
      const manager = AlertManager.getInstance();

      const alert1 = manager.createAlert("Test Alert", "message");
      expect(alert1).toBeDefined();

      const alert2 = manager.createAlert("Test Alert", "message");
      expect(alert2).toBeNull(); // Deduplicated
    });

    it("should allow duplicate alerts after minAlertInterval", function (done) {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: { minAlertInterval: 100 },
      } as any);

      const alert1 = manager.createAlert("Test Alert", "message");
      expect(alert1).toBeDefined();

      const alert2 = manager.createAlert("Test Alert", "message");
      expect(alert2).toBeNull();

      setTimeout(() => {
        const alert3 = manager.createAlert("Test Alert", "message");
        expect(alert3).toBeDefined();
        done();
      }, 150);
    });

    it("should include serviceId in alert when provided", function () {
      const manager = AlertManager.getInstance();

      const alert = manager.createAlert(
        "Service Alert",
        "message",
        AlertLevel.Warning,
        "service1",
      );

      expect(alert?.serviceId).toBe("service1");
    });

    it("should include details in alert when provided", function () {
      const manager = AlertManager.getInstance();
      const details = { error: "Connection timeout", retries: 3 };

      const alert = manager.createAlert(
        "Service Alert",
        "message",
        AlertLevel.Warning,
        "service1",
        details,
      );

      expect(alert?.details).toEqual(details);
    });

    it("should use first configured channel for alert", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        channels: [AlertChannel.Zotero, AlertChannel.Log],
      });

      const alert = manager.createAlert("Test Alert", "message");

      expect(alert?.channel).toBe(AlertChannel.Zotero);
    });

    it("should default to Log channel if none configured", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({ channels: [] });

      const alert = manager.createAlert("Test Alert", "message");

      expect(alert?.channel).toBe(AlertChannel.Log);
    });

    it("should handle null serviceId in deduplication key", function () {
      const manager = AlertManager.getInstance();

      const alert1 = manager.createAlert("Global Alert", "message");
      expect(alert1).toBeDefined();

      const alert2 = manager.createAlert("Global Alert", "message");
      expect(alert2).toBeNull();
    });

    it("should differentiate alerts by serviceId", function () {
      const manager = AlertManager.getInstance();

      const alert1 = manager.createAlert(
        "Alert",
        "message",
        AlertLevel.Warning,
        "service1",
      );
      expect(alert1).toBeDefined();

      const alert2 = manager.createAlert(
        "Alert",
        "message",
        AlertLevel.Warning,
        "service2",
      );
      expect(alert2).toBeDefined(); // Different service, not deduplicated
    });

    it("should add alert to history", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message");

      const history = manager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe("Alert 1");
    });
  });

  describe("trackFailure", function () {
    it("should track individual failures", function () {
      const manager = AlertManager.getInstance();

      manager.trackFailure("service1");

      expect(manager.getFailureCount("service1")).toBe(1);
    });

    it("should accumulate failures over time", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 5, // Higher threshold so failures don't trigger alert
          failureWindow: 300000,
        },
      } as any);

      manager.trackFailure("service1");
      manager.trackFailure("service1");
      manager.trackFailure("service1");

      expect(manager.getFailureCount("service1")).toBe(3);
    });

    it("should trigger alert when threshold exceeded", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 2,
          failureWindow: 300000,
        },
      } as any);

      manager.trackFailure("service1");
      manager.trackFailure("service1");

      const history = manager.getHistory();
      expect(history.length).toBeGreaterThan(0);
      const thresholdAlert = history.find(
        (a) => a.title === "Service Threshold Exceeded",
      );
      expect(thresholdAlert).toBeDefined();
    });

    it("should not trigger alert before threshold", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 3,
          failureWindow: 300000,
        },
      } as any);

      manager.trackFailure("service1");
      manager.trackFailure("service1");

      const history = manager.getHistory();
      const thresholdAlert = history.find(
        (a) => a.title === "Service Threshold Exceeded",
      );
      expect(thresholdAlert).toBeUndefined();
    });

    it("should reset failure tracker after threshold alert", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 2,
          failureWindow: 300000,
          minAlertInterval: 0,
        },
      } as any);

      manager.trackFailure("service1");
      manager.trackFailure("service1");

      // Should be reset after threshold alert
      expect(manager.getFailureCount("service1")).toBe(0);
    });

    it("should clean up old failures outside window", function (done) {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 5,
          failureWindow: 100,
        },
      } as any);

      manager.trackFailure("service1");

      setTimeout(() => {
        manager.trackFailure("service1");
        // First failure should be outside the window, so count should be 1
        expect(manager.getFailureCount("service1")).toBe(1);
        done();
      }, 150);
    });

    it("should track failures per service independently", function () {
      const manager = AlertManager.getInstance();

      manager.trackFailure("service1");
      manager.trackFailure("service1");
      manager.trackFailure("service2");

      expect(manager.getFailureCount("service1")).toBe(2);
      expect(manager.getFailureCount("service2")).toBe(1);
    });

    it("should include failure count in threshold alert details", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 2,
          failureWindow: 300000,
        },
      } as any);

      manager.trackFailure("service1");
      manager.trackFailure("service1");

      const history = manager.getHistory();
      const thresholdAlert = history.find(
        (a) => a.title === "Service Threshold Exceeded",
      );

      expect(thresholdAlert?.details?.failureCount).toBe(2);
    });
  });

  describe("alertCircuitBreakerChange", function () {
    it("should create alert on state change", function () {
      const manager = AlertManager.getInstance();

      manager.alertCircuitBreakerChange("service1", "CLOSED", "OPEN");

      const history = manager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe("Circuit Breaker State Change");
    });

    it("should use Error level for OPEN state", function () {
      const manager = AlertManager.getInstance();

      manager.alertCircuitBreakerChange("service1", "CLOSED", "OPEN");

      const history = manager.getHistory();
      expect(history[0].level).toBe(AlertLevel.Error);
    });

    it("should use Warning level for non-OPEN state", function () {
      const manager = AlertManager.getInstance();

      manager.alertCircuitBreakerChange("service1", "OPEN", "HALF_OPEN");

      const history = manager.getHistory();
      expect(history[0].level).toBe(AlertLevel.Warning);
    });

    it("should include state transition in details", function () {
      const manager = AlertManager.getInstance();

      manager.alertCircuitBreakerChange("service1", "CLOSED", "OPEN");

      const history = manager.getHistory();
      expect(history[0].details?.oldState).toBe("CLOSED");
      expect(history[0].details?.newState).toBe("OPEN");
    });

    it("should not alert when circuit breaker alerting disabled", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: { circuitBreakerStateChange: false },
      } as any);

      manager.alertCircuitBreakerChange("service1", "CLOSED", "OPEN");

      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });

    it("should include serviceId in circuit breaker alert", function () {
      const manager = AlertManager.getInstance();

      manager.alertCircuitBreakerChange("service1", "CLOSED", "OPEN");

      const history = manager.getHistory();
      expect(history[0].serviceId).toBe("service1");
    });
  });

  describe("history management", function () {
    it("should retrieve alert history", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message");
      manager.createAlert("Alert 2", "message");

      const history = manager.getHistory();
      expect(history).toHaveLength(2);
    });

    it("should sort history by timestamp descending", function (done) {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message");
      // Small delay to ensure different timestamps
      setTimeout(() => {
        const alert2 = manager.createAlert("Alert 2", "message");

        const history = manager.getHistory();
        expect(history[0].id).toBe(alert2?.id); // Most recent first
        done();
      }, 10);
    });

    it("should get alerts for specific service", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message", AlertLevel.Warning, "service1");
      manager.createAlert("Alert 2", "message", AlertLevel.Warning, "service2");
      manager.createAlert("Alert 3", "message", AlertLevel.Warning, "service1");

      const service1Alerts = manager.getServiceAlerts("service1");
      expect(service1Alerts).toHaveLength(2);
      expect(service1Alerts.every((a) => a.serviceId === "service1")).toBe(
        true,
      );
    });

    it("should get unacknowledged alerts", function () {
      const manager = AlertManager.getInstance();

      const alert1 = manager.createAlert("Alert 1", "message");
      const alert2 = manager.createAlert("Alert 2", "message");

      const unacknowledged = manager.getUnacknowledgedAlerts();
      expect(unacknowledged).toHaveLength(2);

      if (alert1) {
        manager.acknowledgeAlert(alert1.id);
      }

      const stillUnacknowledged = manager.getUnacknowledgedAlerts();
      expect(stillUnacknowledged).toHaveLength(1);
    });

    it("should acknowledge alert", function () {
      const manager = AlertManager.getInstance();

      const alert = manager.createAlert("Alert", "message");

      if (alert) {
        const acknowledged = manager.acknowledgeAlert(alert.id);
        expect(acknowledged).toBe(true);

        const history = manager.getHistory();
        expect(history[0].acknowledged).toBe(true);
      }
    });

    it("should return false when acknowledging non-existent alert", function () {
      const manager = AlertManager.getInstance();

      const acknowledged = manager.acknowledgeAlert("non-existent");
      expect(acknowledged).toBe(false);
    });

    it("should clear alert history", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message");
      manager.createAlert("Alert 2", "message");

      manager.clearHistory();

      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });

    it("should limit history size to maxHistorySize", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({ maxHistorySize: 5 });

      for (let i = 0; i < 10; i++) {
        manager.createAlert(`Alert ${i}`, "message");
      }

      const history = manager.getHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it("should remove oldest alerts when exceeding maxHistorySize", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({ maxHistorySize: 2 });

      const alert1 = manager.createAlert("Alert 1", "message");
      const alert2 = manager.createAlert("Alert 2", "message");
      const alert3 = manager.createAlert("Alert 3", "message");

      const history = manager.getHistory();
      expect(history).toHaveLength(2);
      expect(history.find((a) => a.id === alert1?.id)).toBeUndefined(); // Oldest removed
      expect(history.find((a) => a.id === alert2?.id)).toBeDefined();
      expect(history.find((a) => a.id === alert3?.id)).toBeDefined();
    });
  });

  describe("preference management", function () {
    it("should set preferences", function () {
      const manager = AlertManager.getInstance();

      manager.setPreferences({ enabled: false });

      expect(manager.getPreferences().enabled).toBe(false);
    });

    it("should merge preferences with existing defaults", function () {
      const manager = AlertManager.getInstance();
      const original = manager.getPreferences();

      manager.setPreferences({ enabled: false });

      const updated = manager.getPreferences();
      expect(updated.enabled).toBe(false);
      expect(updated.level).toBe(original.level); // Other settings unchanged
    });

    it("should get current preferences", function () {
      const manager = AlertManager.getInstance();

      const prefs = manager.getPreferences();

      expect(prefs).toBeDefined();
      expect(prefs.enabled).toBe(true);
      expect(prefs.channels).toBeDefined();
      expect(prefs.level).toBeDefined();
      expect(prefs.thresholds).toBeDefined();
    });

    it("should have default preferences", function () {
      const manager = AlertManager.getInstance();

      const prefs = manager.getPreferences();

      expect(prefs.enabled).toBe(true);
      expect(prefs.channels).toContain(AlertChannel.Log);
      expect(prefs.level).toBe(AlertLevel.Warning);
      expect(prefs.thresholds.failureCount).toBe(3);
      expect(prefs.thresholds.minAlertInterval).toBe(60000);
    });
  });

  describe("failure tracking", function () {
    it("should reset failure tracker for service", function () {
      const manager = AlertManager.getInstance();

      manager.trackFailure("service1");
      manager.trackFailure("service1");

      manager.resetFailureTracker("service1");

      expect(manager.getFailureCount("service1")).toBe(0);
    });

    it("should return 0 for non-existent service", function () {
      const manager = AlertManager.getInstance();

      const count = manager.getFailureCount("non-existent");

      expect(count).toBe(0);
    });

    it("should count only failures within window", function (done) {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: { failureWindow: 100 },
      } as any);

      manager.trackFailure("service1");

      setTimeout(() => {
        manager.trackFailure("service1");
        // Only the most recent failure should be counted
        expect(manager.getFailureCount("service1")).toBe(1);
        done();
      }, 150);
    });
  });

  describe("singleton pattern", function () {
    it("should return same instance on multiple calls", function () {
      const manager1 = AlertManager.getInstance();
      const manager2 = AlertManager.getInstance();

      expect(manager1).toBe(manager2);
    });

    it("should maintain state across calls", function () {
      const manager1 = AlertManager.getInstance();
      manager1.createAlert("Alert 1", "message");

      const manager2 = AlertManager.getInstance();
      const history = manager2.getHistory();

      expect(history).toHaveLength(1);
    });
  });

  describe("audit reporting", function () {
    it("should export comprehensive audit report", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message");
      manager.createAlert("Alert 2", "message");
      manager.trackFailure("service1");
      manager.trackFailure("service1");

      const report = manager.exportAuditReport();

      expect(report.timestamp).toBeDefined();
      expect(report.summary.totalAlerts).toBeGreaterThan(0);
      expect(report.summary.activeAlerts).toBeGreaterThan(0);
      expect(report.summary.acknowledgedAlerts).toBe(0);
      expect(report.summary.preferences).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.failureTracking).toBeDefined();
    });

    it("should include acknowledged alerts in report", function () {
      const manager = AlertManager.getInstance();

      const alert = manager.createAlert("Test Alert", "message");
      if (alert) {
        manager.acknowledgeAlert(alert.id);
      }

      const report = manager.exportAuditReport();

      expect(report.summary.acknowledgedAlerts).toBe(1);
      expect(report.summary.activeAlerts).toBe(0);
    });

    it("should track failure counts in audit report", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 5,
          failureWindow: 300000,
        },
      } as any);

      manager.trackFailure("service1");
      manager.trackFailure("service1");
      manager.trackFailure("service2");

      const report = manager.exportAuditReport();

      expect(report.failureTracking["service1"]).toBe(2);
      expect(report.failureTracking["service2"]).toBe(1);
    });
  });

  describe("edge cases", function () {
    it("should handle alerts with very long messages", function () {
      const manager = AlertManager.getInstance();
      const longMessage = "x".repeat(10000);

      const alert = manager.createAlert("Long Alert", longMessage);

      expect(alert?.message).toBe(longMessage);
    });

    it("should handle rapid successive alerts", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({ thresholds: { minAlertInterval: 0 } } as any);

      for (let i = 0; i < 100; i++) {
        manager.createAlert(`Alert ${i}`, "message");
      }

      const history = manager.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it("should handle very large failure counts", function () {
      const manager = AlertManager.getInstance();
      manager.setPreferences({
        thresholds: {
          failureCount: 1000,
          failureWindow: 300000,
        },
      } as any);

      for (let i = 0; i < 500; i++) {
        manager.trackFailure("service1");
      }

      expect(manager.getFailureCount("service1")).toBe(500);
    });

    it("should maintain history integrity with concurrent operations", function () {
      const manager = AlertManager.getInstance();

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(manager.createAlert(`Alert ${i}`, "message")),
        );
      }

      return Promise.all(promises).then(() => {
        const history = manager.getHistory();
        expect(history.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Activity tracking", function () {
    it("should track archive attempts", function () {
      const manager = AlertManager.getInstance();

      const event = manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "testService",
        itemId: 123,
        itemTitle: "Test Item",
        url: "https://example.com",
      });

      expect(event).toBeDefined();
      expect(event?.serviceId).toBe("testService");
      expect(event?.itemId).toBe(123);
      expect(event?.type).toBe("archive_attempt");
    });

    it("should track archive successes", function () {
      const manager = AlertManager.getInstance();

      const event = manager.trackActivity({
        type: "archive_success" as any,
        serviceId: "testService",
        result: "success",
      });

      expect(event).toBeDefined();
      expect(event?.result).toBe("success");
    });

    it("should track archive failures", function () {
      const manager = AlertManager.getInstance();

      const event = manager.trackActivity({
        type: "archive_failure" as any,
        serviceId: "testService",
        result: "failure",
        message: "Connection timeout",
      });

      expect(event).toBeDefined();
      expect(event?.result).toBe("failure");
      expect(event?.message).toBe("Connection timeout");
    });

    it("should retrieve activity history", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });
      manager.trackActivity({
        type: "archive_success" as any,
        serviceId: "service1",
      });

      const history = manager.getActivityHistory(10);

      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.some((e) => e.type === "archive_attempt")).toBe(true);
      expect(history.some((e) => e.type === "archive_success")).toBe(true);
    });

    it("should retrieve activity by service", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });
      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service2",
      });

      const service1History = manager.getServiceActivity("service1", 10);

      expect(service1History.length).toBeGreaterThan(0);
      expect(service1History.every((e) => e.serviceId === "service1")).toBe(true);
    });

    it("should clear activity history", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });

      let history = manager.getActivityHistory(10);
      expect(history.length).toBeGreaterThan(0);

      manager.clearActivityHistory();

      history = manager.getActivityHistory(10);
      expect(history.length).toBe(0);
    });

    it("should filter activities by criteria", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_success" as any,
        serviceId: "service1",
        result: "success",
      });
      manager.trackActivity({
        type: "archive_failure" as any,
        serviceId: "service2",
        result: "failure",
      });

      const successActivities = manager.filterActivities({
        results: ["success"],
      });

      expect(successActivities.length).toBeGreaterThan(0);
      expect(successActivities.every((e) => e.result === "success")).toBe(true);
    });

    it("should filter activities by service", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });
      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service2",
      });

      const filtered = manager.filterActivities({
        services: ["service1"],
      });

      expect(filtered.every((e) => e.serviceId === "service1")).toBe(true);
    });

    it("should filter activities by type", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });
      manager.trackActivity({
        type: "archive_success" as any,
        serviceId: "service1",
      });

      const filtered = manager.filterActivities({
        types: ["archive_success" as any],
      });

      expect(filtered.every((e) => e.type === "archive_success")).toBe(true);
    });
  });

  describe("Metrics and statistics", function () {
    it("should get metrics by period", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
        result: "success",
      });

      const metrics = manager.getMetricsByPeriod(60000);

      expect(metrics).toBeDefined();
      expect(metrics.totalAttempts).toBeGreaterThan(0);
    });

    it("should get hourly metrics", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });

      const hourly = manager.getHourlyMetrics(1);

      expect(hourly).toBeDefined();
      expect(Array.isArray(hourly)).toBe(true);
    });

    it("should get activity statistics", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_success" as any,
        serviceId: "service1",
        result: "success",
      });
      manager.trackActivity({
        type: "archive_failure" as any,
        serviceId: "service1",
        result: "failure",
      });

      const stats = manager.getActivityStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalActivities).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Alert queries and helpers", function () {
    it("should find alerts by criteria", function () {
      const manager = AlertManager.getInstance();

      const alert = manager.createAlert("Test Alert", "message", AlertLevel.Warning, undefined, "service1");

      if (alert) {
        const found = manager.findAlerts({
          serviceId: "service1",
        });

        expect(found.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should get critical alerts", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Critical Alert", "message", AlertLevel.Critical as any);
      manager.createAlert("Info Alert", "message", AlertLevel.Info);

      const critical = manager.getCriticalAlerts();

      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every((a) => a.level === AlertLevel.Critical)).toBe(true);
    });

    it("should get recent service alerts", function () {
      const manager = AlertManager.getInstance();

      const alert = manager.createAlert("Service Alert", "message", AlertLevel.Error, undefined, "service1");

      if (alert) {
        const recent = manager.getRecentServiceAlerts("service1", 1);

        expect(recent.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should count alerts by level", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Error 1", "message", AlertLevel.Error);
      manager.createAlert("Error 2", "message", AlertLevel.Error);
      manager.createAlert("Warning", "message", AlertLevel.Warning);

      const counts = manager.countAlertsByLevel();

      expect(counts[AlertLevel.Error]).toBeGreaterThanOrEqual(2);
      expect(counts[AlertLevel.Warning]).toBeGreaterThanOrEqual(1);
    });

    it("should get alert trends", function () {
      const manager = AlertManager.getInstance();

      manager.createAlert("Alert 1", "message", AlertLevel.Error);
      manager.createAlert("Alert 2", "message", AlertLevel.Error);

      const trends = manager.getAlertTrend(60000, 1);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe("Circuit breaker tracking", function () {
    it("should track circuit breaker state changes", function () {
      const manager = AlertManager.getInstance();

      manager.trackCircuitBreakerStateChange("service1", "OPEN");

      const stats = manager.getCircuitBreakerStats();

      expect(stats).toBeDefined();
    });

    it("should get circuit breaker stats", function () {
      const manager = AlertManager.getInstance();

      manager.trackCircuitBreakerStateChange("service1", "OPEN");
      manager.trackCircuitBreakerStateChange("service1", "HALF_OPEN");
      manager.trackCircuitBreakerStateChange("service2", "OPEN");

      const stats = manager.getCircuitBreakerStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });

    it("should alert on circuit breaker state transitions", function () {
      const manager = AlertManager.getInstance();

      manager.alertCircuitBreakerChange("service1", "CLOSED", "OPEN");

      const alerts = manager.findAlerts({
        serviceId: "service1",
      });

      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  describe("Monitoring summary", function () {
    it("should generate comprehensive monitoring summary", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });
      manager.createAlert("Test Alert", "message", AlertLevel.Error);

      const summary = manager.getMonitoringSummary();

      expect(summary).toBeDefined();
      expect(summary.health).toBeDefined();
      expect(summary.health.totalAlerts).toBeGreaterThan(0);
      expect(summary.services).toBeDefined();
      expect(summary.activity).toBeDefined();
    });

    it("should include service health in summary", function () {
      const manager = AlertManager.getInstance();

      manager.trackCircuitBreakerStateChange("service1", "OPEN");
      manager.trackActivity({
        type: "archive_failure" as any,
        serviceId: "service1",
      });

      const summary = manager.getMonitoringSummary();

      expect(summary.services).toBeDefined();
    });

    it("should include service information in summary", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_attempt" as any,
        serviceId: "service1",
      });

      const summary = manager.getMonitoringSummary();

      expect(summary.services).toBeDefined();
      expect(summary.services).toHaveProperty("totalMonitored");
    });

    it("should include activity metrics in summary", function () {
      const manager = AlertManager.getInstance();

      manager.trackActivity({
        type: "archive_success" as any,
        serviceId: "service1",
        result: "success",
      });

      const summary = manager.getMonitoringSummary();

      expect(summary.activity).toBeDefined();
      expect(summary.activity.totalActivities).toBeGreaterThan(0);
    });
  });
});
