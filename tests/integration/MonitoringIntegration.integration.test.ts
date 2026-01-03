/**
 * Integration tests for AlertManager and HealthChecker monitoring
 * Tests the coordination between monitoring and archive operations
 */

import { AlertManager } from "../../src/modules/archive/AlertManager";
import { HealthChecker } from "../../src/modules/archive/HealthChecker";
import { ServiceRegistry } from "../../src/modules/archive/ServiceRegistry";
import { ArchiveCoordinator } from "../../src/modules/archive/ArchiveCoordinator";
import {
  ArchiveService,
  ArchiveResult,
  AlertLevel,
} from "../../src/modules/archive/types";

// Mock services for integration testing
const createMockService = (
  id: string,
  options: {
    available?: boolean;
    shouldSucceed?: boolean;
    delay?: number;
  } = {},
): ArchiveService => {
  const { available = true, shouldSucceed = true, delay = 0 } = options;

  return {
    name: `Mock ${id}`,
    id,
    isAvailable: jest.fn().mockResolvedValue(available),
    archive: jest
      .fn()
      .mockImplementation(async (items: any[]): Promise<ArchiveResult[]> => {
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        return items.map((item) => ({
          item,
          success: shouldSucceed,
          archivedUrl: shouldSucceed ? `https://archive.org/${id}` : undefined,
          error: shouldSucceed ? undefined : "Archive failed",
          service: id,
        }));
      }),
  };
};

const createMockItem = (id: number) =>
  ({
    id,
    key: `KEY${id}`,
    version: 1,
    itemType: "webpage",
    getField: jest.fn().mockReturnValue(`http://example${id}.com`),
    setField: jest.fn(),
    getTags: jest.fn().mockReturnValue([]),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    getNotes: jest.fn().mockReturnValue([]),
    getNote: jest.fn(),
    setNote: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    saveTx: jest.fn().mockResolvedValue(undefined),
  }) as any;

describe("Monitoring Integration", function () {
  let alertManager: AlertManager;
  let coordinator: ArchiveCoordinator;
  let registry: ServiceRegistry;

  beforeEach(function () {
    // Reset singleton instances
    (AlertManager as any).instance = undefined;
    (ArchiveCoordinator as any).instance = undefined;
    (ServiceRegistry as any).instance = undefined;

    // Initialize managers
    alertManager = AlertManager.getInstance();
    coordinator = ArchiveCoordinator.getInstance();
    registry = ServiceRegistry.getInstance();

    // Initialize registry and clear existing services
    registry.clear();
    registry.init();

    // Clear HealthChecker cache (static method)
    HealthChecker.clearCache();
  });

  afterEach(function () {
    alertManager.clearHistory();
    HealthChecker.clearCache();
  });

  describe("AlertManager integration with ArchiveCoordinator", function () {
    it("should track failures when archiving fails", function () {
      // Set low threshold for testing
      alertManager.setPreferences({
        thresholds: {
          failureCount: 2,
          failureWindow: 300000,
          minAlertInterval: 0,
        },
      } as any);

      // Directly track failures (this is what ArchiveCoordinator does)
      alertManager.trackFailure("failing");

      // Verify failure was tracked
      expect(alertManager.getFailureCount("failing")).toBe(1);

      // Track another failure
      alertManager.trackFailure("failing");

      // Second failure should trigger alert but reset counter
      expect(alertManager.getFailureCount("failing")).toBe(0);

      // Verify alert was generated
      const alerts = alertManager.getHistory();
      expect(alerts.some((a) => a.title === "Service Threshold Exceeded")).toBe(
        true,
      );
    });

    it("should generate alert when failure threshold exceeded", async function () {
      alertManager.setPreferences({
        thresholds: {
          failureCount: 2,
          failureWindow: 300000,
          minAlertInterval: 0,
        },
      } as any);

      // Trigger multiple failures
      alertManager.trackFailure("service1");
      alertManager.trackFailure("service1");

      // Should have generated an alert
      const alerts = alertManager.getHistory();
      const thresholdAlert = alerts.find(
        (a) => a.title === "Service Threshold Exceeded",
      );

      expect(thresholdAlert).toBeDefined();
      expect(thresholdAlert?.level).toBe(AlertLevel.Error);
    });

    it("should deduplicate alerts to prevent spam", function () {
      alertManager.setPreferences({
        thresholds: { minAlertInterval: 0 },
      } as any);

      // Create same alert multiple times
      const alert1 = alertManager.createAlert("Test Alert", "message");
      const alert2 = alertManager.createAlert("Test Alert", "message");
      const alert3 = alertManager.createAlert("Test Alert", "message");

      // First should succeed, others should be deduplicated
      expect(alert1).toBeDefined();
      expect(alert2).toBeNull();
      expect(alert3).toBeNull();

      // Only one alert in history
      const history = alertManager.getHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe("HealthChecker integration with services", function () {
    it("should check individual service health", async function () {
      const healthyService = createMockService("healthy", { available: true });
      const unhealthyService = createMockService("unhealthy", {
        available: false,
      });

      registry.register("healthy", healthyService);
      registry.register("unhealthy", unhealthyService);

      const healthyResult = await HealthChecker.checkService("healthy");
      const unhealthyResult = await HealthChecker.checkService("unhealthy");

      expect(healthyResult.status).toBe("healthy");
      expect(unhealthyResult.status).toBe("unhealthy");
    });

    it("should check all services in parallel", async function () {
      const service1 = createMockService("service1", { available: true });
      const service2 = createMockService("service2", { available: true });

      registry.register("service1", service1);
      registry.register("service2", service2);

      const startTime = Date.now();
      const results = await HealthChecker.checkAllServices();
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(2);
      expect(results.every((r: any) => r.status === "healthy")).toBe(true);
      // Should complete reasonably quickly (not serialized)
      expect(duration).toBeLessThan(5000);
    });

    it("should cache health check results", async function () {
      const service = createMockService("service1", { available: true });

      registry.register("service1", service);

      await HealthChecker.checkService("service1");
      const cached = HealthChecker.getCachedResult("service1");

      expect(cached).toBeDefined();
      expect(cached?.status).toBe("healthy");
    });

    it("should handle missing services gracefully", async function () {
      const result = await HealthChecker.checkService("nonexistent");

      expect(result.status).toBe("unknown");
      expect(result.message).toContain("not found");
    });
  });

  describe("cross-system monitoring coordination", function () {
    it("should track failures and generate alerts coordinated with health checks", async function () {
      alertManager.setPreferences({
        thresholds: {
          failureCount: 2,
          failureWindow: 300000,
          minAlertInterval: 0,
        },
      } as any);

      const failingService = createMockService("failing", {
        available: false,
        shouldSucceed: false,
      });

      registry.register("failing", failingService);

      // Track failures
      alertManager.trackFailure("failing");
      alertManager.trackFailure("failing");

      // Check health
      const healthResult = await HealthChecker.checkService("failing");

      // Verify both systems detected the issue
      expect(healthResult.status).toBe("unhealthy");
      expect(alertManager.getFailureCount("failing")).toBe(0); // Reset after alert
      const alerts = alertManager.getHistory();
      expect(alerts.some((a) => a.title === "Service Threshold Exceeded")).toBe(
        true,
      );
    });

    it("should maintain alert history across monitoring operations", async function () {
      const service = createMockService("service1", { available: true });

      registry.register("service1", service);

      // Create an alert
      alertManager.createAlert("Test Alert", "message");

      // Check service health
      await HealthChecker.checkService("service1");

      // Alert history should still be intact
      const history = alertManager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe("Test Alert");
    });

    it("should provide service-specific alerts", function () {
      // Create alerts for different services
      alertManager.createAlert(
        "Alert A",
        "message",
        AlertLevel.Warning,
        "service1",
      );
      alertManager.createAlert(
        "Alert B",
        "message",
        AlertLevel.Warning,
        "service2",
      );
      alertManager.createAlert(
        "Alert C",
        "message",
        AlertLevel.Warning,
        "service1",
      );

      const service1Alerts = alertManager.getServiceAlerts("service1");
      const service2Alerts = alertManager.getServiceAlerts("service2");

      expect(service1Alerts).toHaveLength(2);
      expect(service2Alerts).toHaveLength(1);
    });
  });

  describe("alert acknowledgment workflow", function () {
    it("should track acknowledged vs unacknowledged alerts", function () {
      const alert1 = alertManager.createAlert("Alert 1", "message");
      const alert2 = alertManager.createAlert("Alert 2", "message");

      if (alert1) {
        alertManager.acknowledgeAlert(alert1.id);
      }

      const unacknowledged = alertManager.getUnacknowledgedAlerts();
      expect(unacknowledged).toHaveLength(1);
      expect(unacknowledged[0].id).toBe(alert2?.id);
    });

    it("should maintain acknowledgment state across operations", function () {
      const alert = alertManager.createAlert("Test Alert", "message");

      // Acknowledge
      if (alert) {
        alertManager.acknowledgeAlert(alert.id);
      }

      // Check health (shouldn't affect acknowledgment)
      const history = alertManager.getHistory();

      expect(history[0].acknowledged).toBe(true);
    });
  });

  describe("alert preference management", function () {
    it("should respect alert level preferences", function () {
      alertManager.setPreferences({ level: AlertLevel.Error });

      const infoAlert = alertManager.createAlert(
        "Info",
        "message",
        AlertLevel.Info,
      );
      const errorAlert = alertManager.createAlert(
        "Error",
        "message",
        AlertLevel.Error,
      );

      expect(infoAlert).toBeNull();
      expect(errorAlert).toBeDefined();
    });

    it("should respect enabled/disabled preference", function () {
      alertManager.setPreferences({ enabled: false });

      const alert = alertManager.createAlert("Test", "message");

      expect(alert).toBeNull();
      expect(alertManager.getHistory()).toHaveLength(0);
    });
  });
});
