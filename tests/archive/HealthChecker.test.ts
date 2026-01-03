/**
 * Tests for HealthChecker utility
 */

import { HealthChecker } from "../../src/modules/archive/HealthChecker";
import { HealthStatus } from "../../src/modules/archive/types";
import { ServiceRegistry } from "../../src/modules/archive/ServiceRegistry";

// Mock ServiceRegistry
jest.mock("../../src/modules/archive/ServiceRegistry", () => {
  return {
    ServiceRegistry: {
      getInstance: jest.fn(),
    },
  };
});

describe("HealthChecker", function () {
  let mockRegistry: any;

  beforeEach(function () {
    jest.clearAllMocks();
    HealthChecker.clearCache();

    mockRegistry = {
      get: jest.fn(),
      getAvailable: jest.fn().mockReturnValue([]),
    };

    (ServiceRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);
  });

  describe("checkService", function () {
    it("should return healthy status for available service", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.get.mockReturnValue(mockService);

      const result = await HealthChecker.checkService("test");

      expect(result.serviceId).toBe("test");
      expect(result.serviceName).toBe("Test Service");
      expect(result.status).toBe(HealthStatus.Healthy);
      expect(result.message).toContain("available");
      expect(result.lastChecked).toBeDefined();
      expect(result.responseTime).toBeDefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should return unhealthy status for unavailable service", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockResolvedValue(false),
      };

      mockRegistry.get.mockReturnValue(mockService);

      const result = await HealthChecker.checkService("test");

      expect(result.status).toBe(HealthStatus.Unhealthy);
      expect(result.message).toContain("not available");
    });

    it("should handle service timeout", async function () {
      const mockService = {
        name: "Slow Service",
        id: "slow",
        isAvailable: jest.fn(
          () =>
            new Promise(() => {
              /* never resolves */
            }),
        ),
      };

      mockRegistry.get.mockReturnValue(mockService);

      const result = await HealthChecker.checkService("slow", { timeout: 100 });

      expect(result.status).toBe(HealthStatus.Unhealthy);
      expect(result.message).toContain("timeout");
      expect(result.responseTime).toBeGreaterThanOrEqual(100);
    });

    it("should handle service errors", async function () {
      const mockService = {
        name: "Error Service",
        id: "error",
        isAvailable: jest.fn().mockRejectedValue(new Error("Network error")),
      };

      mockRegistry.get.mockReturnValue(mockService);

      const result = await HealthChecker.checkService("error");

      expect(result.status).toBe(HealthStatus.Unhealthy);
      expect(result.message).toContain("Network error");
    });

    it("should return unknown for non-existent service", async function () {
      mockRegistry.get.mockReturnValue(null);

      const result = await HealthChecker.checkService("nonexistent");

      expect(result.status).toBe(HealthStatus.Unknown);
      expect(result.message).toContain("not found");
    });

    it("should include details when requested", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.get.mockReturnValue(mockService);

      const result = await HealthChecker.checkService("test", {
        includeDetails: true,
      });

      expect(result.details).toBeDefined();
      expect(result.details?.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.details?.checkedAt).toBeDefined();
    });

    it("should measure response time correctly", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 50);
            }),
        ),
      };

      mockRegistry.get.mockReturnValue(mockService);

      const result = await HealthChecker.checkService("test");

      expect(result.responseTime).toBeGreaterThanOrEqual(50);
    });

    it("should cache result after check", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.get.mockReturnValue(mockService);

      await HealthChecker.checkService("test");
      const cached = HealthChecker.getCachedResult("test");

      expect(cached).toBeDefined();
      expect(cached?.status).toBe(HealthStatus.Healthy);
    });
  });

  describe("checkAllServices", function () {
    it("should check all available services", async function () {
      const mockService1 = {
        name: "Service 1",
        id: "service1",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const mockService2 = {
        name: "Service 2",
        id: "service2",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.getAvailable.mockReturnValue([
        { id: "service1", service: mockService1 },
        { id: "service2", service: mockService2 },
      ]);

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "service1") return mockService1;
        if (id === "service2") return mockService2;
        return null;
      });

      const results = await HealthChecker.checkAllServices();

      expect(results).toHaveLength(2);
      expect(results[0].serviceId).toBe("service1");
      expect(results[1].serviceId).toBe("service2");
      expect(results.every((r) => r.status === HealthStatus.Healthy)).toBe(
        true,
      );
    });

    it("should handle mixed healthy and unhealthy services", async function () {
      const mockService1 = {
        name: "Healthy Service",
        id: "healthy",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const mockService2 = {
        name: "Unhealthy Service",
        id: "unhealthy",
        isAvailable: jest.fn().mockResolvedValue(false),
      };

      mockRegistry.getAvailable.mockReturnValue([
        { id: "healthy", service: mockService1 },
        { id: "unhealthy", service: mockService2 },
      ]);

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "healthy") return mockService1;
        if (id === "unhealthy") return mockService2;
        return null;
      });

      const results = await HealthChecker.checkAllServices();

      expect(results).toHaveLength(2);
      const healthy = results.find((r) => r.serviceId === "healthy");
      const unhealthy = results.find((r) => r.serviceId === "unhealthy");

      expect(healthy?.status).toBe(HealthStatus.Healthy);
      expect(unhealthy?.status).toBe(HealthStatus.Unhealthy);
    });

    it("should check services in parallel", async function () {
      const mockService1 = {
        name: "Service 1",
        id: "service1",
        isAvailable: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 100);
            }),
        ),
      };

      const mockService2 = {
        name: "Service 2",
        id: "service2",
        isAvailable: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 100);
            }),
        ),
      };

      mockRegistry.getAvailable.mockReturnValue([
        { id: "service1", service: mockService1 },
        { id: "service2", service: mockService2 },
      ]);

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "service1") return mockService1;
        if (id === "service2") return mockService2;
        return null;
      });

      const startTime = Date.now();
      await HealthChecker.checkAllServices();
      const duration = Date.now() - startTime;

      // Should take ~100ms (parallel) not ~200ms (sequential)
      expect(duration).toBeLessThan(200);
    });
  });

  describe("cache operations", function () {
    it("should retrieve cached result", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.get.mockReturnValue(mockService);

      await HealthChecker.checkService("test");
      const cached = HealthChecker.getCachedResult("test");

      expect(cached).toBeDefined();
      expect(cached?.status).toBe(HealthStatus.Healthy);
    });

    it("should return null for uncached service", function () {
      const cached = HealthChecker.getCachedResult("nonexistent");

      expect(cached).toBeNull();
    });

    it("should get all cached results", async function () {
      const mockService1 = {
        name: "Service 1",
        id: "service1",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const mockService2 = {
        name: "Service 2",
        id: "service2",
        isAvailable: jest.fn().mockResolvedValue(false),
      };

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "service1") return mockService1;
        if (id === "service2") return mockService2;
        return null;
      });

      await HealthChecker.checkService("service1");
      await HealthChecker.checkService("service2");

      const allCached = HealthChecker.getAllCachedResults();

      expect(allCached).toHaveLength(2);
    });

    it("should clear cache", async function () {
      const mockService = {
        name: "Test Service",
        id: "test",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.get.mockReturnValue(mockService);

      await HealthChecker.checkService("test");
      expect(HealthChecker.getCachedResult("test")).toBeDefined();

      HealthChecker.clearCache();
      expect(HealthChecker.getCachedResult("test")).toBeNull();
    });
  });

  describe("health status queries", function () {
    it("should detect unhealthy services", async function () {
      const mockService1 = {
        name: "Healthy",
        id: "healthy",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const mockService2 = {
        name: "Unhealthy",
        id: "unhealthy",
        isAvailable: jest.fn().mockResolvedValue(false),
      };

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "healthy") return mockService1;
        if (id === "unhealthy") return mockService2;
        return null;
      });

      await HealthChecker.checkService("healthy");
      await HealthChecker.checkService("unhealthy");

      expect(HealthChecker.hasUnhealthyServices()).toBe(true);
    });

    it("should return false when all services healthy", async function () {
      const mockService = {
        name: "Healthy",
        id: "healthy",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      mockRegistry.get.mockReturnValue(mockService);

      await HealthChecker.checkService("healthy");

      expect(HealthChecker.hasUnhealthyServices()).toBe(false);
    });

    it("should count healthy services", async function () {
      const mockService1 = {
        name: "Healthy",
        id: "healthy",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const mockService2 = {
        name: "Unhealthy",
        id: "unhealthy",
        isAvailable: jest.fn().mockResolvedValue(false),
      };

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "healthy") return mockService1;
        if (id === "unhealthy") return mockService2;
        return null;
      });

      await HealthChecker.checkService("healthy");
      await HealthChecker.checkService("unhealthy");

      expect(HealthChecker.getHealthyCount()).toBe(1);
    });

    it("should provide health summary", async function () {
      const mockService1 = {
        name: "Healthy",
        id: "healthy",
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const mockService2 = {
        name: "Unhealthy",
        id: "unhealthy",
        isAvailable: jest.fn().mockResolvedValue(false),
      };

      mockRegistry.get.mockImplementation((id: string) => {
        if (id === "healthy") return mockService1;
        if (id === "unhealthy") return mockService2;
        return null;
      });

      await HealthChecker.checkService("healthy");
      await HealthChecker.checkService("unhealthy");

      const summary = HealthChecker.getSummary();

      expect(summary.healthy).toBe(1);
      expect(summary.unhealthy).toBe(1);
      expect(summary.lastUpdated).toBeDefined();
    });
  });
});
