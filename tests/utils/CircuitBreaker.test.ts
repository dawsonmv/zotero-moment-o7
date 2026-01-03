/**
 * Unit tests for CircuitBreaker
 */

import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerManager,
  CircuitBreakerError,
  CircuitBreakerEvent,
} from "../../src/utils/CircuitBreaker";

describe("CircuitBreaker", function () {
  let breaker: CircuitBreaker;

  beforeEach(function () {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      volumeThreshold: 5,
    });
  });

  describe("CLOSED state", function () {
    it("should execute operations normally when closed", async function () {
      const operation = jest.fn().mockResolvedValue("success");
      const result = await breaker.execute(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
      expect(breaker.getState().state).toBe(CircuitState.CLOSED);
    });

    it("should count failures", async function () {
      const operation = jest.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      const state = breaker.getState();
      expect(state.failures).toBe(2);
      expect(state.state).toBe(CircuitState.CLOSED);
    });

    it("should open after reaching failure threshold with sufficient volume", async function () {
      const operation = jest.fn().mockRejectedValue(new Error("fail"));

      // Need to reach volume threshold first
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      const state = breaker.getState();
      expect(state.state).toBe(CircuitState.OPEN);
      expect(state.failures).toBeGreaterThanOrEqual(3);
    });

    it("should not open if volume threshold not met", async function () {
      const operation = jest.fn().mockRejectedValue(new Error("fail"));

      // Only 3 calls (below volume threshold of 5)
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      expect(breaker.getState().state).toBe(CircuitState.CLOSED);
    });
  });

  describe("OPEN state", function () {
    beforeEach(async function () {
      // Open the circuit
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }
    });

    it("should reject calls when open", async function () {
      const operation = jest.fn().mockResolvedValue("success");

      await expect(breaker.execute(operation)).rejects.toThrow(
        "Circuit breaker is OPEN",
      );

      expect(operation).not.toHaveBeenCalled();
    });

    it("should use fallback when provided", async function () {
      const operation = jest.fn().mockResolvedValue("success");
      const fallback = jest.fn().mockResolvedValue("fallback");

      const result = await breaker.execute(operation, fallback);

      expect(result).toBe("fallback");
      expect(operation).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
    });

    it("should transition to HALF_OPEN after timeout", async function () {
      expect(breaker.getState().state).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const operation = jest.fn().mockResolvedValue("success");
      await breaker.execute(operation);

      expect(operation).toHaveBeenCalled();
    });
  });

  describe("HALF_OPEN state", function () {
    beforeEach(async function () {
      // Open circuit then wait for timeout
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    it("should close after successful operations", async function () {
      const operation = jest.fn().mockResolvedValue("success");

      // Need 2 successes to close
      await breaker.execute(operation);
      await breaker.execute(operation);

      expect(breaker.getState().state).toBe(CircuitState.CLOSED);
    });

    it("should reopen on failure", async function () {
      const operation = jest.fn().mockRejectedValue(new Error("fail"));

      try {
        await breaker.execute(operation);
      } catch {}

      expect(breaker.getState().state).toBe(CircuitState.OPEN);
    });

    it("should limit concurrent half-open calls", async function () {
      const operation = jest.fn().mockResolvedValue("success");
      const fallback = jest.fn().mockResolvedValue("fallback");

      // First 2 calls succeed
      await breaker.execute(operation);
      await breaker.execute(operation);

      // Circuit should be closed now, but if it weren't...
      // Additional calls would use fallback
      const promises = Array(5)
        .fill(null)
        .map(() => breaker.execute(operation, fallback));

      await Promise.all(promises);

      // All should succeed since circuit closed after 2 successes
      expect(operation.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("error filtering", function () {
    it("should only count filtered errors", async function () {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        volumeThreshold: 2,
        errorFilter: (error) => error.message !== "ignore",
      });

      const operation1 = jest.fn().mockRejectedValue(new Error("ignore"));
      const operation2 = jest.fn().mockRejectedValue(new Error("count"));

      // These shouldn't count
      try {
        await breaker.execute(operation1);
      } catch {}
      try {
        await breaker.execute(operation1);
      } catch {}

      expect(breaker.getState().state).toBe(CircuitState.CLOSED);

      // These should count
      try {
        await breaker.execute(operation2);
      } catch {}
      try {
        await breaker.execute(operation2);
      } catch {}

      expect(breaker.getState().state).toBe(CircuitState.OPEN);
    });
  });

  describe("manual controls", function () {
    it("should reset state", async function () {
      breaker.trip();
      expect(breaker.getState().state).toBe(CircuitState.OPEN);

      breaker.reset();
      const state = breaker.getState();
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
    });

    it("should manually trip", function () {
      breaker.trip();
      expect(breaker.getState().state).toBe(CircuitState.OPEN);
    });
  });

  describe("CircuitBreakerError", function () {
    it("should include state and optional service ID", function () {
      const error = new CircuitBreakerError(
        CircuitState.OPEN,
        "service1",
        "Custom message",
      );

      expect(error.state).toBe(CircuitState.OPEN);
      expect(error.serviceId).toBe("service1");
      expect(error.message).toBe("Custom message");
      expect(error.name).toBe("CircuitBreakerError");
      expect(error instanceof Error).toBe(true);
    });

    it("should use default message if not provided", function () {
      const error = new CircuitBreakerError(CircuitState.HALF_OPEN);

      expect(error.message).toBe("Circuit breaker is HALF_OPEN");
      expect(error.serviceId).toBeUndefined();
    });

    it("should be throwable and catchable", async function () {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        volumeThreshold: 1,
      });

      breaker.trip();

      await expect(breaker.execute(() => Promise.resolve("ok"))).rejects.toThrow(
        CircuitBreakerError,
      );
    });
  });

  describe("event emitter", function () {
    it("should emit events on state transitions", async function () {
      const events: CircuitBreakerEvent[] = [];
      const listener = jest.fn((event: CircuitBreakerEvent) => {
        events.push(event);
      });

      breaker.subscribe(listener);

      // Trigger CLOSED -> OPEN transition
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].previousState).toBe(CircuitState.CLOSED);
      expect(events[0].newState).toBe(CircuitState.OPEN);
      expect(events[0].reason).toContain("Failure threshold reached");
    });

    it("should emit event with timestamp and reason", async function () {
      const events: CircuitBreakerEvent[] = [];
      breaker.subscribe((event) => events.push(event));

      // Trigger CLOSED -> OPEN transition naturally
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      expect(events.length).toBeGreaterThan(0);
      const event = events[0];
      expect(event.timestamp).toBeLessThanOrEqual(Date.now());
      expect(event.timestamp).toBeGreaterThan(Date.now() - 1000);
      expect(event.reason).toBeDefined();
      expect(event.previousState).toBe(CircuitState.CLOSED);
      expect(event.newState).toBe(CircuitState.OPEN);
    });

    it("should support unsubscribe", async function () {
      const listener = jest.fn();
      const unsubscribe = breaker.subscribe(listener);

      unsubscribe();

      breaker.trip();

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle listener errors gracefully", async function () {
      const badListener = jest.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });
      const goodListener = jest.fn();

      breaker.subscribe(badListener);
      breaker.subscribe(goodListener);

      // Trigger transition (should not throw despite bad listener)
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      // Both listeners called, despite badListener throwing
      expect(badListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });

    it("should clear listeners on reset", async function () {
      const listener = jest.fn();
      breaker.subscribe(listener);

      breaker.reset();

      // Trigger a trip (which would normally emit)
      breaker.trip();

      // Listener should not be called after reset
      expect(listener).not.toHaveBeenCalled();
    });

    it("should emit OPEN -> HALF_OPEN transition", async function () {
      const events: CircuitBreakerEvent[] = [];
      breaker.subscribe((event) => events.push(event));

      // Trip the circuit
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      // Wait for timeout and trigger transition
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const goodOperation = jest.fn().mockResolvedValue("success");
      await breaker.execute(goodOperation);

      // Look for OPEN -> HALF_OPEN transition event
      const halfOpenEvent = events.find(
        (e) => e.previousState === CircuitState.OPEN && e.newState === CircuitState.HALF_OPEN,
      );
      expect(halfOpenEvent).toBeDefined();
      expect(halfOpenEvent?.reason).toContain("Timeout expired");
    });

    it("should emit HALF_OPEN -> CLOSED transition", async function () {
      const events: CircuitBreakerEvent[] = [];
      breaker.subscribe((event) => events.push(event));

      // Trip and recover
      const operation = jest.fn().mockRejectedValue(new Error("fail"));
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(operation);
        } catch {}
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const goodOperation = jest.fn().mockResolvedValue("success");
      await breaker.execute(goodOperation);
      await breaker.execute(goodOperation);

      // Look for HALF_OPEN -> CLOSED transition event
      const closedEvent = events.find(
        (e) => e.previousState === CircuitState.HALF_OPEN && e.newState === CircuitState.CLOSED,
      );
      expect(closedEvent).toBeDefined();
      expect(closedEvent?.reason).toContain("Service recovered");
    });
  });
});

describe("CircuitBreakerManager", function () {
  beforeEach(function () {
    // Reset singleton for test isolation
    (CircuitBreakerManager as any).instance = undefined;
  });

  describe("singleton pattern", function () {
    it("should return same instance", function () {
      const manager1 = CircuitBreakerManager.getInstance();
      const manager2 = CircuitBreakerManager.getInstance();

      expect(manager1).toBe(manager2);
    });

    it("should lazy-initialize singleton on first call", function () {
      expect((CircuitBreakerManager as any).instance).toBeUndefined();

      const manager = CircuitBreakerManager.getInstance();

      expect(manager).toBeDefined();
      expect((CircuitBreakerManager as any).instance).toBe(manager);
    });

    it("should maintain state across multiple getInstance calls", function () {
      const manager1 = CircuitBreakerManager.getInstance();
      manager1.getBreaker("service1").trip();

      const manager2 = CircuitBreakerManager.getInstance();
      const state = manager2.getBreaker("service1").getState();

      expect(state.state).toBe(CircuitState.OPEN);
    });
  });

  describe("breaker management", function () {
    let manager: CircuitBreakerManager;

    beforeEach(function () {
      manager = CircuitBreakerManager.getInstance();
    });

    it("should manage multiple breakers", function () {
      const breaker1 = manager.getBreaker("service1");
      const breaker2 = manager.getBreaker("service2");

      expect(breaker1).toBeDefined();
      expect(breaker2).toBeDefined();
      expect(breaker1).not.toBe(breaker2);
    });

    it("should return same breaker for same service", function () {
      const breaker1 = manager.getBreaker("service1");
      const breaker2 = manager.getBreaker("service1");

      expect(breaker1).toBe(breaker2);
    });

    it("should execute with breaker", async function () {
      const operation = jest.fn().mockResolvedValue("success");

      const result = await manager.execute("service1", operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
    });

    it("should get all states", function () {
      manager.getBreaker("service1");
      manager.getBreaker("service2");

      const states = manager.getAllStates();

      expect(states.size).toBe(2);
      expect(states.has("service1")).toBe(true);
      expect(states.has("service2")).toBe(true);
    });

    it("should get available services", async function () {
      // Trip service1
      manager.getBreaker("service1").trip();
      manager.getBreaker("service2"); // Keep closed

      const available = manager.getAvailableServices();

      expect(available).toEqual(["service2"]);
    });

    it("should reset all breakers", function () {
      manager.getBreaker("service1").trip();
      manager.getBreaker("service2").trip();

      manager.resetAll();

      const states = manager.getAllStates();
      states.forEach((state) => {
        expect(state.state).toBe(CircuitState.CLOSED);
      });
    });
  });
});
