/**
 * Monitoring and Observability Types
 * Adapted for Zotero plugin context (local-first, privacy-respecting)
 */

// Log levels following RFC 5424 syslog severity
export enum LogLevel {
  DEBUG = 7,
  INFO = 6,
  NOTICE = 5,
  WARNING = 4,
  ERROR = 3,
  CRITICAL = 2,
  ALERT = 1,
  EMERGENCY = 0
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  traceId?: string;
}

// Metrics types
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

export interface MetricEntry {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  unit?: string;
}

// Archive operation metrics
export interface ArchiveMetrics {
  serviceId: string;
  url: string;
  success: boolean;
  duration: number;
  errorType?: string;
  httpStatus?: number;
  retryCount: number;
  fromCache: boolean;
}

// Service health status
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export interface ServiceHealth {
  serviceId: string;
  status: HealthStatus;
  lastCheck: number;
  successRate: number;
  avgLatency: number;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  errorCount: number;
  message?: string;
}

// Trace span for distributed tracing (local context)
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'pending';
  tags: Record<string, string>;
  logs: LogEntry[];
}

// Aggregated statistics
export interface AggregatedStats {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: number;
  endTime: number;
  archiveAttempts: number;
  archiveSuccesses: number;
  archiveFailures: number;
  serviceBreakdown: Record<string, {
    attempts: number;
    successes: number;
    failures: number;
    avgLatency: number;
  }>;
  errorBreakdown: Record<string, number>;
  uniqueUrls: number;
}

// Alert definition
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  cooldownMs: number;
  lastTriggered?: number;
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  windowMs: number;
  serviceId?: string;
}

export interface Alert {
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  message: string;
  context: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: number;
}

// Dashboard data
export interface DashboardData {
  timestamp: number;
  services: ServiceHealth[];
  recentArchives: ArchiveMetrics[];
  alerts: Alert[];
  stats: AggregatedStats;
  systemHealth: {
    memoryUsage?: number;
    activeTraces: number;
    pendingOperations: number;
  };
}

// Export report format
export interface MonitoringReport {
  generatedAt: number;
  reportPeriod: {
    start: number;
    end: number;
  };
  summary: {
    totalArchiveAttempts: number;
    successRate: number;
    avgLatency: number;
    mostUsedService: string;
    mostCommonError: string;
  };
  serviceDetails: ServiceHealth[];
  alerts: Alert[];
  recommendations: string[];
}
