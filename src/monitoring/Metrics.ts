/**
 * Metrics Collection for Zotero Moment-o7
 * Tracks archive operations, service health, and performance
 */

import { ArchiveMetrics, AggregatedStats } from './types';

declare const Zotero: any;

export interface MetricsConfig {
  maxEntries: number;
  aggregationIntervals: number[]; // in ms
  enablePersistence: boolean;
}

const DEFAULT_CONFIG: MetricsConfig = {
  maxEntries: 5000,
  aggregationIntervals: [
    60 * 60 * 1000,      // 1 hour
    24 * 60 * 60 * 1000, // 1 day
    7 * 24 * 60 * 60 * 1000 // 1 week
  ],
  enablePersistence: true
};

/**
 * Counter metric - monotonically increasing
 */
export class Counter {
  private value = 0;
  private history: Array<{ timestamp: number; value: number }> = [];

  constructor(
    public readonly name: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  inc(delta = 1): void {
    this.value += delta;
    this.history.push({ timestamp: Date.now(), value: this.value });

    // Keep last 1000 entries
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }

  get(): number {
    return this.value;
  }

  getRate(windowMs: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    const inWindow = this.history.filter(h => h.timestamp >= windowStart);

    if (inWindow.length < 2) return 0;

    const first = inWindow[0];
    const last = inWindow[inWindow.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000; // in seconds

    return duration > 0 ? (last.value - first.value) / duration : 0;
  }

  reset(): void {
    this.value = 0;
    this.history = [];
  }
}

/**
 * Gauge metric - can go up or down
 */
export class Gauge {
  private value = 0;

  constructor(
    public readonly name: string,
    public readonly labels: Record<string, string> = {}
  ) {}

  set(value: number): void {
    this.value = value;
  }

  inc(delta = 1): void {
    this.value += delta;
  }

  dec(delta = 1): void {
    this.value -= delta;
  }

  get(): number {
    return this.value;
  }
}

/**
 * Histogram metric - tracks distribution of values
 */
export class Histogram {
  private values: number[] = [];
  private buckets: Map<number, number> = new Map();
  private sum = 0;
  private count = 0;

  constructor(
    public readonly name: string,
    public readonly bucketBoundaries: number[] = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    public readonly labels: Record<string, string> = {}
  ) {
    // Initialize buckets
    for (const boundary of bucketBoundaries) {
      this.buckets.set(boundary, 0);
    }
    this.buckets.set(Infinity, 0);
  }

  observe(value: number): void {
    this.values.push(value);
    this.sum += value;
    this.count++;

    // Update buckets
    for (const boundary of [...this.bucketBoundaries, Infinity]) {
      if (value <= boundary) {
        this.buckets.set(boundary, (this.buckets.get(boundary) || 0) + 1);
      }
    }

    // Keep last 10000 values for percentile calculations
    if (this.values.length > 10000) {
      this.values = this.values.slice(-10000);
    }
  }

  getPercentile(p: number): number {
    if (this.values.length === 0) return 0;

    const sorted = [...this.values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getMean(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  getCount(): number {
    return this.count;
  }

  getSum(): number {
    return this.sum;
  }

  getBuckets(): Map<number, number> {
    return new Map(this.buckets);
  }

  reset(): void {
    this.values = [];
    this.sum = 0;
    this.count = 0;
    for (const boundary of this.buckets.keys()) {
      this.buckets.set(boundary, 0);
    }
  }
}

/**
 * Timer metric - specialized histogram for duration
 */
export class Timer {
  private histogram: Histogram;
  private activeTimers: Map<string, number> = new Map();

  constructor(
    public readonly name: string,
    public readonly labels: Record<string, string> = {}
  ) {
    this.histogram = new Histogram(
      name,
      [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000],
      labels
    );
  }

  start(id: string = 'default'): void {
    this.activeTimers.set(id, Date.now());
  }

  stop(id: string = 'default'): number {
    const startTime = this.activeTimers.get(id);
    if (!startTime) {
      return 0;
    }

    const duration = Date.now() - startTime;
    this.histogram.observe(duration);
    this.activeTimers.delete(id);
    return duration;
  }

  /**
   * Time an async operation
   */
  async time<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.histogram.observe(duration);
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - start;
      this.histogram.observe(duration);
      throw error;
    }
  }

  /**
   * Observe a duration directly (without start/stop)
   */
  observe(duration: number): void {
    this.histogram.observe(duration);
  }

  getPercentile(p: number): number {
    return this.histogram.getPercentile(p);
  }

  getMean(): number {
    return this.histogram.getMean();
  }

  getCount(): number {
    return this.histogram.getCount();
  }
}

/**
 * Metrics Registry - manages all metrics
 */
export class MetricsRegistry {
  private static instance: MetricsRegistry;
  private config: MetricsConfig;

  // Core metrics
  private archiveAttempts: Counter;
  private archiveSuccesses: Counter;
  private archiveFailures: Counter;
  private archiveDuration: Timer;
  private activeOperations: Gauge;
  private serviceErrors: Map<string, Counter> = new Map();
  private archiveHistory: ArchiveMetrics[] = [];

  private constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize core metrics
    this.archiveAttempts = new Counter('archive_attempts_total');
    this.archiveSuccesses = new Counter('archive_successes_total');
    this.archiveFailures = new Counter('archive_failures_total');
    this.archiveDuration = new Timer('archive_duration_ms');
    this.activeOperations = new Gauge('active_operations');
  }

  static getInstance(config?: Partial<MetricsConfig>): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry(config);
    }
    return MetricsRegistry.instance;
  }

  /**
   * Record an archive operation
   */
  recordArchive(metrics: ArchiveMetrics): void {
    this.archiveAttempts.inc();

    if (metrics.success) {
      this.archiveSuccesses.inc();
    } else {
      this.archiveFailures.inc();

      // Track error by type
      const errorKey = `${metrics.serviceId}:${metrics.errorType || 'unknown'}`;
      if (!this.serviceErrors.has(errorKey)) {
        this.serviceErrors.set(errorKey, new Counter(`errors_${errorKey}`));
      }
      this.serviceErrors.get(errorKey)!.inc();
    }

    // Record duration
    this.archiveDuration.observe(metrics.duration);

    // Store in history
    this.archiveHistory.push(metrics);
    if (this.archiveHistory.length > this.config.maxEntries) {
      this.archiveHistory = this.archiveHistory.slice(-this.config.maxEntries);
    }
  }

  /**
   * Track active operations
   */
  startOperation(): void {
    this.activeOperations.inc();
  }

  endOperation(): void {
    this.activeOperations.dec();
  }

  /**
   * Create a timer for an operation
   */
  createTimer(name: string, labels?: Record<string, string>): Timer {
    return new Timer(name, labels);
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): {
    archiveAttempts: number;
    archiveSuccesses: number;
    archiveFailures: number;
    successRate: number;
    avgDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    activeOperations: number;
    errorBreakdown: Record<string, number>;
  } {
    const attempts = this.archiveAttempts.get();
    const successes = this.archiveSuccesses.get();

    const errorBreakdown: Record<string, number> = {};
    for (const [key, counter] of this.serviceErrors) {
      errorBreakdown[key] = counter.get();
    }

    return {
      archiveAttempts: attempts,
      archiveSuccesses: successes,
      archiveFailures: this.archiveFailures.get(),
      successRate: attempts > 0 ? successes / attempts : 0,
      avgDuration: this.archiveDuration.getMean(),
      p50Duration: this.archiveDuration.getPercentile(50),
      p95Duration: this.archiveDuration.getPercentile(95),
      p99Duration: this.archiveDuration.getPercentile(99),
      activeOperations: this.activeOperations.get(),
      errorBreakdown
    };
  }

  /**
   * Get aggregated stats for a time period
   */
  getAggregatedStats(periodMs: number): AggregatedStats {
    const now = Date.now();
    const startTime = now - periodMs;

    const periodArchives = this.archiveHistory.filter(
      a => a.duration >= startTime // Using duration as timestamp proxy
    );

    const serviceBreakdown: Record<string, {
      attempts: number;
      successes: number;
      failures: number;
      avgLatency: number;
    }> = {};

    const errorBreakdown: Record<string, number> = {};
    const uniqueUrls = new Set<string>();

    for (const archive of periodArchives) {
      uniqueUrls.add(archive.url);

      // Service breakdown
      if (!serviceBreakdown[archive.serviceId]) {
        serviceBreakdown[archive.serviceId] = {
          attempts: 0,
          successes: 0,
          failures: 0,
          avgLatency: 0
        };
      }

      const svc = serviceBreakdown[archive.serviceId];
      svc.attempts++;
      if (archive.success) {
        svc.successes++;
      } else {
        svc.failures++;
        const errKey = archive.errorType || 'unknown';
        errorBreakdown[errKey] = (errorBreakdown[errKey] || 0) + 1;
      }
      svc.avgLatency = (svc.avgLatency * (svc.attempts - 1) + archive.duration) / svc.attempts;
    }

    const period = periodMs <= 3600000 ? 'hour'
      : periodMs <= 86400000 ? 'day'
      : periodMs <= 604800000 ? 'week'
      : 'month';

    return {
      period,
      startTime,
      endTime: now,
      archiveAttempts: periodArchives.length,
      archiveSuccesses: periodArchives.filter(a => a.success).length,
      archiveFailures: periodArchives.filter(a => !a.success).length,
      serviceBreakdown,
      errorBreakdown,
      uniqueUrls: uniqueUrls.size
    };
  }

  /**
   * Get service-specific metrics
   */
  getServiceMetrics(serviceId: string): {
    attempts: number;
    successes: number;
    failures: number;
    successRate: number;
    avgDuration: number;
    recentErrors: string[];
  } {
    const serviceArchives = this.archiveHistory.filter(
      a => a.serviceId === serviceId
    );

    const successes = serviceArchives.filter(a => a.success).length;
    const totalDuration = serviceArchives.reduce((sum, a) => sum + a.duration, 0);

    return {
      attempts: serviceArchives.length,
      successes,
      failures: serviceArchives.length - successes,
      successRate: serviceArchives.length > 0 ? successes / serviceArchives.length : 0,
      avgDuration: serviceArchives.length > 0 ? totalDuration / serviceArchives.length : 0,
      recentErrors: serviceArchives
        .filter(a => !a.success && a.errorType)
        .slice(-10)
        .map(a => a.errorType!)
    };
  }

  /**
   * Get recent archive history
   */
  getRecentArchives(limit = 50): ArchiveMetrics[] {
    return this.archiveHistory.slice(-limit);
  }

  /**
   * Export metrics for debugging/reporting
   */
  export(): string {
    return JSON.stringify({
      snapshot: this.getSnapshot(),
      recentArchives: this.getRecentArchives(100),
      hourlyStats: this.getAggregatedStats(3600000),
      dailyStats: this.getAggregatedStats(86400000)
    }, null, 2);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.archiveAttempts.reset();
    this.archiveSuccesses.reset();
    this.archiveFailures.reset();
    this.archiveDuration = new Timer('archive_duration_ms');
    this.activeOperations.set(0);
    this.serviceErrors.clear();
    this.archiveHistory = [];
  }
}
