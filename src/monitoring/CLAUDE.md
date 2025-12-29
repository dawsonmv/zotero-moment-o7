# src/monitoring/ - Observability Stack

## Purpose

Local-first monitoring system for the Zotero plugin. All data stays on the user's machine - no external telemetry. Provides logging, metrics, tracing, health checks, and alerting.

## Architecture

```
Dashboard.ts (aggregation & reporting)
    ↑
    ├── Logger.ts (structured logs)
    ├── Metrics.ts (counters, gauges, histograms)
    ├── Tracer.ts (operation tracing)
    ├── HealthChecker.ts (service health)
    └── Alerting.ts (local notifications)
```

## Files

| File | Purpose |
|------|---------|
| `types.ts` | LogEntry, MetricEntry, Alert, HealthStatus interfaces |
| `Logger.ts` | Structured logging with RFC 5424 levels |
| `Metrics.ts` | Counter, Gauge, Histogram, Timer primitives |
| `Tracer.ts` | Distributed tracing for operation flow |
| `HealthChecker.ts` | Service health monitoring |
| `Alerting.ts` | Rule-based local alerting |
| `Dashboard.ts` | Aggregated views and reports |
| `index.ts` | Public API and helper functions |

## Quick Start

```typescript
import {
  initializeMonitoring,
  shutdownMonitoring,
  recordArchiveOperation,
  getSystemStatus,
  generateMonitoringReport
} from './monitoring';

// Initialize on plugin startup
initializeMonitoring(['internetarchive', 'archivetoday', 'permacc']);

// Record operations
recordArchiveOperation({
  serviceId: 'internetarchive',
  url: 'https://example.com',
  success: true,
  duration: 5432,
  retryCount: 0,
  fromCache: false
});

// Check status
const status = getSystemStatus();
// → { status: 'ok' | 'degraded' | 'error', message, details }

// Generate report
const report = generateMonitoringReport();
console.log(report);  // Text formatted report

// Cleanup on shutdown
shutdownMonitoring();
```

## Logger.ts

RFC 5424 severity levels with category-based organization:

```typescript
const logger = Logger.getInstance();

// Direct logging
logger.info('Archive', 'Starting operation', { url });
logger.error('Archive', 'Failed', error, { serviceId });

// Category logger (recommended)
const archiveLog = logger.child('Archive');
archiveLog.info('Starting operation', { url });
archiveLog.warning('Retry needed', { attempt: 2 });

// Pre-configured loggers
import { createServiceLogger, createArchiveLogger } from './monitoring';
const iaLog = createServiceLogger('internetarchive');
iaLog.info('Submitting to Wayback Machine');

// Query logs
const errors = logger.getEntries({
  level: LogLevel.ERROR,
  since: Date.now() - 3600000,
  category: 'Archive'
});

// Export for debugging
const json = logger.export({ since: ..., pretty: true });
```

**Log Levels:**
| Level | Value | Use Case |
|-------|-------|----------|
| DEBUG | 7 | Detailed debugging |
| INFO | 6 | Normal operations |
| NOTICE | 5 | Significant events |
| WARNING | 4 | Potential issues |
| ERROR | 3 | Operation failed |
| CRITICAL | 2 | Critical failure |

## Metrics.ts

### Primitives

```typescript
// Counter - monotonically increasing
const counter = new Counter('archive_attempts');
counter.inc();
counter.inc(5);
counter.get();       // Current value
counter.getRate(60000);  // Per-second rate over 1 minute

// Gauge - can go up or down
const gauge = new Gauge('active_operations');
gauge.inc();
gauge.dec();
gauge.set(10);

// Histogram - distribution of values
const histogram = new Histogram('response_sizes', [100, 500, 1000, 5000]);
histogram.observe(234);
histogram.getPercentile(95);  // P95
histogram.getMean();
histogram.getBuckets();  // Count per bucket

// Timer - duration histogram
const timer = new Timer('archive_duration');
timer.start('op-1');
// ... operation ...
timer.stop('op-1');  // Returns duration

// Or time a function
const { result, duration } = await timer.time(() => archiveUrl(url));
```

### MetricsRegistry

```typescript
const metrics = MetricsRegistry.getInstance();

// Record archive operation (most common)
metrics.recordArchive({
  serviceId: 'internetarchive',
  url: 'https://example.com',
  success: true,
  duration: 5432,
  errorType: undefined,
  httpStatus: 200,
  retryCount: 0,
  fromCache: false
});

// Get snapshot
const snapshot = metrics.getSnapshot();
// → { archiveAttempts, successRate, avgDuration, p50Duration, p95Duration, ... }

// Get service-specific
const iaMetrics = metrics.getServiceMetrics('internetarchive');
// → { attempts, successes, failures, successRate, avgDuration, recentErrors }

// Get aggregated stats
const stats = metrics.getAggregatedStats(86400000);  // 24 hours
// → { serviceBreakdown, errorBreakdown, uniqueUrls, ... }
```

## Tracer.ts

Track operation flow:

```typescript
const tracer = Tracer.getInstance();

// Manual tracing
const span = tracer.startTrace('archiveItem');
span.tag('serviceId', 'internetarchive');
span.tag('url', url);

try {
  const result = await archiveUrl(url);
  span.success();
  return result;
} catch (error) {
  span.error(error);
  throw error;
}

// Helper for async operations
const result = await tracer.trace('archiveItem', async (span) => {
  span.tags({ serviceId, url });
  return await archiveUrl(url);
});

// Nested spans
const parentSpan = tracer.startSpan('batchArchive');
for (const item of items) {
  const childSpan = tracer.startSpan('archiveItem', parentSpan.getSpanId());
  // ...
}

// Query traces
const summary = tracer.getTraceSummary(traceId);
const slowSpans = tracer.getSlowSpans(5000);  // > 5s
const errors = tracer.getErrorSpans();
```

## HealthChecker.ts

Monitor service availability:

```typescript
const healthChecker = HealthChecker.getInstance();

// Initialize with services
healthChecker.init(['internetarchive', 'archivetoday', 'permacc']);
healthChecker.startPeriodicChecks();  // Check every 5 minutes

// Get service health
const health = healthChecker.getServiceHealth('internetarchive');
// → { status: 'healthy', successRate: 0.95, avgLatency: 5000, circuitState: 'CLOSED' }

// Get available services (healthy or degraded)
const available = healthChecker.getAvailableServices();

// System health
const system = healthChecker.getSystemHealth();
// → { status: 'degraded', healthyCount: 3, degradedCount: 1, unhealthyCount: 1 }

// Generate text report
const report = healthChecker.generateReport();
```

**Health Statuses:**
| Status | Criteria |
|--------|----------|
| HEALTHY | Success rate ≥95%, latency OK, circuit closed |
| DEGRADED | Success rate 70-95% or high latency |
| UNHEALTHY | Success rate <70% or circuit open |
| UNKNOWN | No recent activity |

## Alerting.ts

Local alerting with Zotero notifications:

```typescript
const alerting = AlertingManager.getInstance();
alerting.start();

// Built-in rules:
// - high-failure-rate: Success rate <50%
// - service-unhealthy: Any service unhealthy
// - high-latency: Average >60s
// - all-services-down: No services available
// - circuit-breaker-open: Any circuit tripped

// Add custom rule
alerting.addRule({
  id: 'permacc-quota',
  name: 'Perma.cc Quota Warning',
  description: 'Approaching monthly limit',
  condition: {
    metric: 'serviceAttempts',
    operator: '>=',
    threshold: 8,
    windowMs: 2592000000,  // 30 days
    serviceId: 'permacc'
  },
  severity: 'warning',
  enabled: true,
  cooldownMs: 86400000  // 24 hours
});

// Query alerts
const active = alerting.getActiveAlerts();
const all = alerting.getAllAlerts({ severity: 'error', limit: 50 });
const stats = alerting.getAlertStats();

// Acknowledge (manually resolve)
alerting.acknowledgeAlert(alertTimestamp);
```

## Dashboard.ts

Aggregate all monitoring data:

```typescript
const dashboard = Dashboard.getInstance();

// Full dashboard data
const data = dashboard.getDashboardData();
// → { timestamp, services, recentArchives, alerts, stats, systemHealth }

// Generate report
const report = dashboard.generateReport(86400000);  // 24 hours
const text = dashboard.formatReportAsText(report);

// Quick status
const quick = dashboard.getQuickStatus();
// → { status: 'ok', message: 'All systems operational', details: [] }

// Export all for debugging
const exportData = dashboard.exportAll();  // JSON string
```

## Integration with Archive Services

```typescript
// In BaseArchiveService or ArchiveCoordinator
import { recordArchiveOperation, Tracer } from './monitoring';

async function archiveItem(item: Item, serviceId: string) {
  const tracer = Tracer.getInstance();
  const startTime = Date.now();

  return tracer.trace('archiveItem', async (span) => {
    span.tags({ serviceId, itemId: item.id, url: item.getField('url') });

    try {
      const result = await service.archive([item]);

      recordArchiveOperation({
        serviceId,
        url: item.getField('url'),
        success: result.success,
        duration: Date.now() - startTime,
        errorType: result.error?.type,
        retryCount: 0,
        fromCache: false
      });

      return result;
    } catch (error) {
      recordArchiveOperation({
        serviceId,
        url: item.getField('url'),
        success: false,
        duration: Date.now() - startTime,
        errorType: 'UNKNOWN',
        retryCount: 0,
        fromCache: false
      });
      throw error;
    }
  });
}
```

## Privacy Design

- **All local**: No external telemetry, everything stored in memory
- **No persistence by default**: Data lost on restart (can be enabled)
- **User-controlled**: Clear via `Logger.clear()`, `MetricsRegistry.reset()`
- **No PII**: URLs stored only for diagnostics, can be cleared
