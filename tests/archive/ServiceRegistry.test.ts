/**
 * Unit tests for ServiceRegistry
 */

import { ServiceRegistry } from "../../src/modules/archive/ServiceRegistry";
import { ArchiveService, ArchiveResult } from "../../src/modules/archive/types";

// Mock service for testing
const createMockService = (id: string, available = true): ArchiveService => ({
  name: `Mock ${id} Service`,
  id,
  isAvailable: jest.fn().mockResolvedValue(available),
  archive: jest.fn().mockResolvedValue([{ success: true }] as ArchiveResult[]),
});

describe("ServiceRegistry", function () {
  let registry: ServiceRegistry;

  beforeEach(function () {
    // Reset singleton by clearing it
    registry = ServiceRegistry.getInstance();
    registry.clear();
  });

  describe("singleton pattern", function () {
    it("should return the same instance", function () {
      const instance1 = ServiceRegistry.getInstance();
      const instance2 = ServiceRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("initialization", function () {
    it("should initialize successfully", function () {
      expect(() => registry.init()).not.toThrow();
    });

    it("should be idempotent", function () {
      registry.init();
      registry.init(); // Should not throw
      expect(registry.getAll()).toHaveLength(0);
    });

    it("should throw when registering before initialization", function () {
      const service = createMockService("test");
      expect(() => registry.register("test", service)).toThrow(
        "Service Registry not initialized",
      );
    });
  });

  describe("register", function () {
    beforeEach(function () {
      registry.init();
    });

    it("should register a service", function () {
      const service = createMockService("test");
      registry.register("test", service);
      expect(registry.get("test")).toBe(service);
    });

    it("should replace existing service with same id", function () {
      const service1 = createMockService("test");
      const service2 = createMockService("test");

      registry.register("test", service1);
      registry.register("test", service2);

      expect(registry.get("test")).toBe(service2);
    });

    it("should register multiple services", function () {
      const service1 = createMockService("service1");
      const service2 = createMockService("service2");

      registry.register("service1", service1);
      registry.register("service2", service2);

      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe("unregister", function () {
    beforeEach(function () {
      registry.init();
    });

    it("should unregister an existing service", function () {
      const service = createMockService("test");
      registry.register("test", service);

      expect(registry.unregister("test")).toBe(true);
      expect(registry.get("test")).toBeUndefined();
    });

    it("should return false for non-existent service", function () {
      expect(registry.unregister("nonexistent")).toBe(false);
    });
  });

  describe("get", function () {
    beforeEach(function () {
      registry.init();
    });

    it("should return registered service", function () {
      const service = createMockService("test");
      registry.register("test", service);
      expect(registry.get("test")).toBe(service);
    });

    it("should return undefined for non-existent service", function () {
      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("getAll", function () {
    beforeEach(function () {
      registry.init();
    });

    it("should return empty array when no services", function () {
      expect(registry.getAll()).toEqual([]);
    });

    it("should return all registered services", function () {
      const service1 = createMockService("service1");
      const service2 = createMockService("service2");

      registry.register("service1", service1);
      registry.register("service2", service2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((e) => e.id)).toContain("service1");
      expect(all.map((e) => e.id)).toContain("service2");
    });
  });

  describe("getAvailable", function () {
    beforeEach(function () {
      registry.init();
    });

    it("should return only available services", async function () {
      const available = createMockService("available", true);
      const unavailable = createMockService("unavailable", false);

      registry.register("available", available);
      registry.register("unavailable", unavailable);

      const result = await registry.getAvailable();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("available");
    });

    it("should handle service availability check errors", async function () {
      const errorService = createMockService("error", true);
      (errorService.isAvailable as jest.Mock).mockRejectedValue(
        new Error("Check failed"),
      );

      registry.register("error", errorService);

      const result = await registry.getAvailable();
      expect(result).toHaveLength(0);
    });

    it("should return empty array when no services available", async function () {
      const unavailable = createMockService("unavailable", false);
      registry.register("unavailable", unavailable);

      const result = await registry.getAvailable();
      expect(result).toHaveLength(0);
    });
  });

  describe("clear", function () {
    it("should clear all services and reset initialization", function () {
      registry.init();
      const service = createMockService("test");
      registry.register("test", service);

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      // After clear, should need to init again
      expect(() => registry.register("test", service)).toThrow();
    });
  });
});
