/**
 * Tests for Tracer
 */

import { Tracer } from "../../src/modules/monitoring/Tracer";
import { Logger } from "../../src/modules/monitoring/Logger";
import { LogLevel } from "../../src/modules/monitoring/types";

// Mock Logger
jest.mock("../../src/modules/monitoring/Logger");

describe("Tracer", function () {
  let tracer: Tracer;
  let mockLogger: any;

  beforeEach(function () {
    jest.clearAllMocks();

    // Reset singleton
    (Tracer as any).instance = undefined;

    // Mock Logger
    mockLogger = {
      setTraceId: jest.fn(),
      clearTraceId: jest.fn(),
    };
    (Logger.getInstance as jest.Mock).mockReturnValue(mockLogger);

    tracer = Tracer.getInstance();
  });

  afterEach(function () {
    tracer.clear();
  });

  describe("singleton pattern", function () {
    it("should return same instance", function () {
      const instance1 = Tracer.getInstance();
      const instance2 = Tracer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("startTrace", function () {
    it("should start a new trace with unique ID", function () {
      const span = tracer.startTrace("test-operation");
      expect(span.getTraceId()).toBeDefined();
      expect(span.getTraceId().length).toBeGreaterThan(0);
    });

    it("should set trace ID on logger", function () {
      tracer.startTrace("test-operation");
      expect(mockLogger.setTraceId).toHaveBeenCalled();
    });

    it("should set current trace ID", function () {
      const span = tracer.startTrace("test-operation");
      expect(tracer.getCurrentTraceId()).toBe(span.getTraceId());
    });
  });

  describe("startSpan", function () {
    it("should create span with parent", function () {
      const parentSpan = tracer.startTrace("parent");
      const childSpan = tracer.startSpan("child", parentSpan.getSpanId());

      // Complete both spans
      childSpan.success();
      parentSpan.success();

      const traces = tracer.getTrace(parentSpan.getTraceId());
      const childSpanData = traces.find((s) => s.operationName === "child");
      expect(childSpanData?.parentSpanId).toBe(parentSpan.getSpanId());
    });

    it("should use current trace ID", function () {
      const parentSpan = tracer.startTrace("parent");
      const childSpan = tracer.startSpan("child");

      expect(childSpan.getTraceId()).toBe(parentSpan.getTraceId());

      childSpan.success();
      parentSpan.success();
    });
  });

  describe("endTrace", function () {
    it("should clear current trace ID", function () {
      tracer.startTrace("test");
      tracer.endTrace();
      expect(tracer.getCurrentTraceId()).toBeUndefined();
    });

    it("should clear trace ID on logger", function () {
      tracer.startTrace("test");
      tracer.endTrace();
      expect(mockLogger.clearTraceId).toHaveBeenCalled();
    });
  });

  describe("SpanBuilder", function () {
    describe("tag", function () {
      it("should add a tag", function () {
        const span = tracer.startTrace("test");
        span.tag("key", "value");
        const result = span.success();

        expect(result.tags.key).toBe("value");
      });
    });

    describe("tags", function () {
      it("should add multiple tags", function () {
        const span = tracer.startTrace("test");
        span.tags({ key1: "value1", key2: "value2" });
        const result = span.success();

        expect(result.tags.key1).toBe("value1");
        expect(result.tags.key2).toBe("value2");
      });
    });

    describe("log", function () {
      it("should add log entry", function () {
        const span = tracer.startTrace("test");
        span.log(LogLevel.INFO, "Test message", { context: "value" });
        const result = span.success();

        expect(result.logs).toHaveLength(1);
        expect(result.logs[0].message).toBe("Test message");
        expect(result.logs[0].level).toBe(LogLevel.INFO);
      });
    });

    describe("success", function () {
      it("should mark span as success", function () {
        const span = tracer.startTrace("test");
        const result = span.success();

        expect(result.status).toBe("success");
        expect(result.endTime).toBeDefined();
        expect(result.duration).toBeDefined();
      });
    });

    describe("error", function () {
      it("should mark span as error", function () {
        const span = tracer.startTrace("test");
        const result = span.error();

        expect(result.status).toBe("error");
      });

      it("should capture error details", function () {
        const span = tracer.startTrace("test");
        const testError = new Error("Test error message");
        const result = span.error(testError);

        expect(result.tags.error).toBe("true");
        expect(result.tags["error.message"]).toBe("Test error message");
      });

      it("should capture stack trace", function () {
        const span = tracer.startTrace("test");
        const testError = new Error("Test error");
        testError.stack =
          "Error: Test\n  at line1\n  at line2\n  at line3\n  at line4";
        const result = span.error(testError);

        expect(result.tags["error.stack"]).toBeDefined();
        // Should only include first 3 lines
        expect(
          result.tags["error.stack"].split("\n").length,
        ).toBeLessThanOrEqual(3);
      });
    });

    describe("getSpanId/getTraceId", function () {
      it("should return span ID", function () {
        const span = tracer.startTrace("test");
        expect(span.getSpanId()).toBeDefined();
        span.success();
      });

      it("should return trace ID", function () {
        const span = tracer.startTrace("test");
        expect(span.getTraceId()).toBeDefined();
        span.success();
      });
    });
  });

  describe("recordSpan", function () {
    it("should record completed spans", function () {
      const span = tracer.startTrace("test");
      span.success();

      const traces = tracer.getTrace(span.getTraceId());
      expect(traces).toHaveLength(1);
    });

    it("should trim spans when over limit", function () {
      // Record many spans
      for (let i = 0; i < 1100; i++) {
        const span = tracer.startSpan(`operation-${i}`);
        span.success();
      }

      // Should be trimmed to maxSpans (1000)
      const recentTraces = tracer.getRecentTraces(2000);
      expect(recentTraces.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("trace", function () {
    it("should trace async operation successfully", async function () {
      const result = await tracer.trace("async-op", async (span) => {
        span.tag("test", "value");
        return "success-result";
      });

      expect(result).toBe("success-result");
    });

    it("should mark span as success on completion", async function () {
      const traceId = tracer.startTrace("root").getTraceId();

      await tracer.trace("async-op", async () => {
        return "result";
      });

      const spans = tracer.getTrace(traceId);
      const asyncSpan = spans.find((s) => s.operationName === "async-op");
      expect(asyncSpan?.status).toBe("success");
    });

    it("should mark span as error on exception", async function () {
      const traceSpan = tracer.startTrace("root");
      const traceId = traceSpan.getTraceId();

      await expect(
        tracer.trace("failing-op", async () => {
          throw new Error("Test failure");
        }),
      ).rejects.toThrow("Test failure");

      traceSpan.success();

      const spans = tracer.getTrace(traceId);
      const failingSpan = spans.find((s) => s.operationName === "failing-op");
      expect(failingSpan?.status).toBe("error");
    });

    it("should apply tags from options", async function () {
      const traceSpan = tracer.startTrace("root");

      await tracer.trace("tagged-op", async () => "result", {
        tags: { serviceId: "test-service" },
      });

      traceSpan.success();

      const spans = tracer.getTrace(traceSpan.getTraceId());
      const taggedSpan = spans.find((s) => s.operationName === "tagged-op");
      expect(taggedSpan?.tags.serviceId).toBe("test-service");
    });

    it("should set parent span ID from options", async function () {
      const parentSpan = tracer.startTrace("parent");

      await tracer.trace("child-op", async () => "result", {
        parentSpanId: parentSpan.getSpanId(),
      });

      parentSpan.success();

      const spans = tracer.getTrace(parentSpan.getTraceId());
      const childSpan = spans.find((s) => s.operationName === "child-op");
      expect(childSpan?.parentSpanId).toBe(parentSpan.getSpanId());
    });
  });

  describe("getTrace", function () {
    it("should return all spans for a trace", function () {
      const rootSpan = tracer.startTrace("root");
      const childSpan = tracer.startSpan("child", rootSpan.getSpanId());
      const grandchildSpan = tracer.startSpan(
        "grandchild",
        childSpan.getSpanId(),
      );

      grandchildSpan.success();
      childSpan.success();
      rootSpan.success();

      const spans = tracer.getTrace(rootSpan.getTraceId());
      expect(spans).toHaveLength(3);
    });

    it("should return empty array for non-existent trace", function () {
      const spans = tracer.getTrace("non-existent-trace-id");
      expect(spans).toHaveLength(0);
    });
  });

  describe("getRecentTraces", function () {
    it("should return unique trace IDs", function () {
      const trace1 = tracer.startTrace("op1");
      tracer.startSpan("child1", trace1.getSpanId()).success();
      trace1.success();

      const trace2 = tracer.startTrace("op2");
      trace2.success();

      const recent = tracer.getRecentTraces(10);
      expect(recent).toHaveLength(2);
    });

    it("should limit results", function () {
      for (let i = 0; i < 10; i++) {
        tracer.startTrace(`op-${i}`).success();
      }

      const recent = tracer.getRecentTraces(5);
      expect(recent).toHaveLength(5);
    });
  });

  describe("getTraceSummary", function () {
    it("should return summary for trace", function () {
      const rootSpan = tracer.startTrace("root-operation");
      const childSpan = tracer.startSpan(
        "child-operation",
        rootSpan.getSpanId(),
      );

      childSpan.success();
      rootSpan.success();

      const summary = tracer.getTraceSummary(rootSpan.getTraceId());

      expect(summary).not.toBeNull();
      expect(summary?.rootOperation).toBe("root-operation");
      expect(summary?.spanCount).toBe(2);
      expect(summary?.status).toBe("success");
    });

    it("should return null for non-existent trace", function () {
      const summary = tracer.getTraceSummary("non-existent");
      expect(summary).toBeNull();
    });

    it("should report error status when any span fails", function () {
      const rootSpan = tracer.startTrace("root");
      const childSpan = tracer.startSpan("failing-child");

      childSpan.error(new Error("Test"));
      rootSpan.success();

      const summary = tracer.getTraceSummary(rootSpan.getTraceId());
      expect(summary?.status).toBe("error");
    });

    it("should calculate span depths", function () {
      const rootSpan = tracer.startTrace("root");
      const childSpan = tracer.startSpan("child", rootSpan.getSpanId());
      const grandchildSpan = tracer.startSpan(
        "grandchild",
        childSpan.getSpanId(),
      );

      grandchildSpan.success();
      childSpan.success();
      rootSpan.success();

      const summary = tracer.getTraceSummary(rootSpan.getTraceId());

      const rootDepth = summary?.spans.find(
        (s) => s.operation === "root",
      )?.depth;
      const childDepth = summary?.spans.find(
        (s) => s.operation === "child",
      )?.depth;
      const grandchildDepth = summary?.spans.find(
        (s) => s.operation === "grandchild",
      )?.depth;

      expect(rootDepth).toBe(0);
      expect(childDepth).toBe(1);
      expect(grandchildDepth).toBe(2);
    });
  });

  describe("getSlowSpans", function () {
    it("should return spans above threshold", function () {
      // We can't easily control duration in tests, but we can test the filter logic
      const span = tracer.startTrace("test");
      span.success();

      // Since test executes quickly, threshold of 1000000ms should return nothing
      const slowSpans = tracer.getSlowSpans(1000000);
      expect(slowSpans).toHaveLength(0);

      // Threshold of -1 should include all spans (since duration >= 0)
      const allSpans = tracer.getSlowSpans(-1);
      expect(allSpans.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getErrorSpans", function () {
    it("should return only error spans", function () {
      const successSpan = tracer.startTrace("success");
      successSpan.success();

      const errorSpan = tracer.startSpan("error");
      errorSpan.error(new Error("Test"));

      const errorSpans = tracer.getErrorSpans();
      expect(errorSpans).toHaveLength(1);
      expect(errorSpans[0].operationName).toBe("error");
    });
  });

  describe("export", function () {
    it("should export all spans as JSON", function () {
      tracer.startTrace("test").success();

      const exported = tracer.export();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it("should filter by traceId", function () {
      const trace1 = tracer.startTrace("op1");
      trace1.success();

      const trace2 = tracer.startTrace("op2");
      trace2.success();

      const exported = tracer.export({ traceId: trace1.getTraceId() });
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].traceId).toBe(trace1.getTraceId());
    });

    it("should filter by since timestamp", function () {
      const span = tracer.startTrace("test");
      span.success();

      // Filter for future timestamp should return empty
      const exported = tracer.export({ since: Date.now() + 10000 });
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveLength(0);
    });
  });

  describe("clear", function () {
    it("should clear all spans", function () {
      tracer.startTrace("test").success();
      tracer.startTrace("test2").success();

      tracer.clear();

      const recent = tracer.getRecentTraces(100);
      expect(recent).toHaveLength(0);
    });
  });
});
