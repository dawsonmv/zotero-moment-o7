/**
 * Distributed Tracing for Zotero Moment-o7
 * Tracks operation flow through the plugin for debugging
 */

import { TraceSpan, LogLevel } from "./types";
import { Logger } from "./Logger";

declare const Zotero: any;

/**
 * Generate a unique trace ID
 */
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
};

/**
 * Span builder for fluent API
 */
export class SpanBuilder {
  private span: TraceSpan;

  constructor(
    private tracer: Tracer,
    operationName: string,
    parentSpanId?: string,
  ) {
    this.span = {
      traceId: tracer.getCurrentTraceId() || generateId(),
      spanId: generateId(),
      parentSpanId,
      operationName,
      startTime: Date.now(),
      status: "pending",
      tags: {},
      logs: [],
    };
  }

  /**
   * Add a tag to the span
   */
  tag(key: string, value: string): SpanBuilder {
    this.span.tags[key] = value;
    return this;
  }

  /**
   * Add multiple tags
   */
  tags(tags: Record<string, string>): SpanBuilder {
    Object.assign(this.span.tags, tags);
    return this;
  }

  /**
   * Log an event within the span
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): SpanBuilder {
    this.span.logs.push({
      timestamp: Date.now(),
      level,
      category: this.span.operationName,
      message,
      context,
      traceId: this.span.traceId,
    });
    return this;
  }

  /**
   * Mark span as successful and finish
   */
  success(): TraceSpan {
    this.span.status = "success";
    return this.finish();
  }

  /**
   * Mark span as failed and finish
   */
  error(err?: Error): TraceSpan {
    this.span.status = "error";
    if (err) {
      this.tag("error", "true");
      this.tag("error.message", err.message);
      if (err.stack) {
        this.tag("error.stack", err.stack.split("\n").slice(0, 3).join("\n"));
      }
    }
    return this.finish();
  }

  /**
   * Finish the span
   */
  private finish(): TraceSpan {
    this.span.endTime = Date.now();
    this.span.duration = this.span.endTime - this.span.startTime;
    this.tracer.recordSpan(this.span);
    return this.span;
  }

  /**
   * Get the span ID for child spans
   */
  getSpanId(): string {
    return this.span.spanId;
  }

  /**
   * Get the trace ID
   */
  getTraceId(): string {
    return this.span.traceId;
  }
}

/**
 * Tracer for tracking operations
 */
export class Tracer {
  private static instance: Tracer;
  private spans: TraceSpan[] = [];
  private activeSpans: Map<string, SpanBuilder> = new Map();
  private currentTraceId?: string;
  private maxSpans = 1000;

  private constructor() {}

  static getInstance(): Tracer {
    if (!Tracer.instance) {
      Tracer.instance = new Tracer();
    }
    return Tracer.instance;
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string): SpanBuilder {
    this.currentTraceId = generateId();
    Logger.getInstance().setTraceId(this.currentTraceId);

    const span = new SpanBuilder(this, operationName);
    this.activeSpans.set(span.getSpanId(), span);
    return span;
  }

  /**
   * Start a new span within current trace
   */
  startSpan(operationName: string, parentSpanId?: string): SpanBuilder {
    const span = new SpanBuilder(this, operationName, parentSpanId);
    this.activeSpans.set(span.getSpanId(), span);
    return span;
  }

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    return this.currentTraceId;
  }

  /**
   * End current trace
   */
  endTrace(): void {
    this.currentTraceId = undefined;
    Logger.getInstance().clearTraceId();
  }

  /**
   * Record a completed span
   */
  recordSpan(span: TraceSpan): void {
    this.spans.push(span);
    this.activeSpans.delete(span.spanId);

    // Trim if over limit
    if (this.spans.length > this.maxSpans) {
      this.spans = this.spans.slice(-this.maxSpans);
    }

    // Debug output
    Zotero.debug(
      `[Trace ${span.traceId.slice(0, 8)}] ${span.operationName}: ` +
        `${span.status} in ${span.duration}ms`,
    );
  }

  /**
   * Trace an async operation
   */
  async trace<T>(
    operationName: string,
    operation: (span: SpanBuilder) => Promise<T>,
    options: {
      parentSpanId?: string;
      tags?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const span = this.startSpan(operationName, options.parentSpanId);

    if (options.tags) {
      span.tags(options.tags);
    }

    try {
      const result = await operation(span);
      span.success();
      return result;
    } catch (error) {
      span.error(error as Error);
      throw error;
    }
  }

  /**
   * Get spans for a trace
   */
  getTrace(traceId: string): TraceSpan[] {
    return this.spans.filter((s) => s.traceId === traceId);
  }

  /**
   * Get recent traces (unique trace IDs)
   */
  getRecentTraces(limit = 20): string[] {
    const traceIds = new Set<string>();
    for (let i = this.spans.length - 1; i >= 0 && traceIds.size < limit; i--) {
      traceIds.add(this.spans[i].traceId);
    }
    return Array.from(traceIds);
  }

  /**
   * Get trace summary
   */
  getTraceSummary(traceId: string): {
    traceId: string;
    rootOperation: string;
    totalDuration: number;
    spanCount: number;
    status: "success" | "error" | "partial";
    spans: Array<{
      operation: string;
      duration: number;
      status: string;
      depth: number;
    }>;
  } | null {
    const traceSpans = this.getTrace(traceId);
    if (traceSpans.length === 0) return null;

    // Find root span (no parent)
    const rootSpan = traceSpans.find((s) => !s.parentSpanId) || traceSpans[0];

    // Calculate total duration
    const totalDuration = traceSpans.reduce(
      (max, s) =>
        Math.max(max, (s.endTime || s.startTime) - rootSpan.startTime),
      0,
    );

    // Determine overall status
    const hasError = traceSpans.some((s) => s.status === "error");
    const allSuccess = traceSpans.every((s) => s.status === "success");
    const status = hasError ? "error" : allSuccess ? "success" : "partial";

    // Build span hierarchy
    const spanDepths = new Map<string, number>();
    const calculateDepth = (span: TraceSpan): number => {
      if (spanDepths.has(span.spanId)) {
        return spanDepths.get(span.spanId)!;
      }
      if (!span.parentSpanId) {
        spanDepths.set(span.spanId, 0);
        return 0;
      }
      const parentSpan = traceSpans.find((s) => s.spanId === span.parentSpanId);
      const depth = parentSpan ? calculateDepth(parentSpan) + 1 : 0;
      spanDepths.set(span.spanId, depth);
      return depth;
    };

    const spans = traceSpans.map((s) => ({
      operation: s.operationName,
      duration: s.duration || 0,
      status: s.status,
      depth: calculateDepth(s),
    }));

    return {
      traceId,
      rootOperation: rootSpan.operationName,
      totalDuration,
      spanCount: traceSpans.length,
      status,
      spans,
    };
  }

  /**
   * Get slow spans (above threshold)
   */
  getSlowSpans(thresholdMs: number): TraceSpan[] {
    return this.spans.filter((s) => (s.duration || 0) > thresholdMs);
  }

  /**
   * Get error spans
   */
  getErrorSpans(): TraceSpan[] {
    return this.spans.filter((s) => s.status === "error");
  }

  /**
   * Export traces for debugging
   */
  export(options: { traceId?: string; since?: number } = {}): string {
    let spans = this.spans;

    if (options.traceId) {
      spans = spans.filter((s) => s.traceId === options.traceId);
    }
    if (options.since) {
      spans = spans.filter((s) => s.startTime >= options.since!);
    }

    return JSON.stringify(spans, null, 2);
  }

  /**
   * Clear all spans
   */
  clear(): void {
    this.spans = [];
    this.activeSpans.clear();
  }
}

/**
 * Decorator-style helper for tracing service methods
 */
export function traced(operationName?: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (this: any, ...args: any[]) {
      const tracer = Tracer.getInstance();
      return tracer.trace(name, async (span) => {
        span.tag("args.count", String(args.length));
        return originalMethod.apply(this, args);
      });
    } as T;

    return descriptor;
  };
}
