# Monitoring and Observability Guide

This guide covers the monitoring and observability system for Zotero Moment-o7.

## Overview

The monitoring system is designed for a **local-first, privacy-respecting** architecture suitable for a Zotero plugin. Unlike server-side monitoring, this system:

- Stores all data locally within Zotero
- Provides insights without external telemetry
- Focuses on archive service health and operation success
- Helps users diagnose issues with archive services

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Dashboard                                │
│              (Aggregated View & Reports)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐    ┌─────────────┐    ┌──────────────┐
│ Logger  │    │   Metrics   │    │   Tracer     │
│         │    │  Registry   │    │              │
└────┬────┘    └──────┬──────┘    └──────┬───────┘
     │                │                   │
     └────────────────┼───────────────────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
       ┌──────────┐    ┌──────────┐
       │  Health  │    │ Alerting │
       │ Checker  │◄───│ Manager  │
       └──────────┘    └──────────┘
```

## Components

### 1. Logger (`Logger.ts`)

Structured logging with categories, levels, and trace correlation.

```typescript
import { Logger, createServiceLogger } from './monitoring';

// Get singleton
const logger = Logger.getInstance();

// Log with category
logger.info('Archive', 'Starting archive operation', { url: 'https://example.com' });

// Create category-scoped logger
const serviceLogger = createServiceLogger('internetarchive');
serviceLogger.info('Submitting to Wayback Machine');
serviceLogger.error('Request failed', error, { httpStatus: 503 });
```

**Log Levels** (RFC 5424):
- `DEBUG (7)` - Detailed debugging
- `INFO (6)` - Normal operations
- `NOTICE (5)` - Significant events
- `WARNING (4)` - Potential issues
- `ERROR (3)` - Errors (operation failed)
- `CRITICAL (2)` - Critical failures
- `ALERT (1)` - Immediate action needed
- `EMERGENCY (0)` - System unusable

### 2. Metrics (`Metrics.ts`)

Collects counters, gauges, histograms, and timers for operations.

```typescript
import { MetricsRegistry, recordArchiveOperation } from './monitoring';

const metrics = MetricsRegistry.getInstance();

// Record an archive operation
recordArchiveOperation({
  serviceId: 'internetarchive',
  url: 'https://example.com',
  success: true,
  duration: 5432,
  retryCount: 0,
  fromCache: false
});

// Get snapshot
const snapshot = metrics.getSnapshot();
console.log(`Success rate: ${snapshot.successRate * 100}%`);
console.log(`P95 latency: ${snapshot.p95Duration}ms`);

// Get service-specific metrics
const iaMetrics = metrics.getServiceMetrics('internetarchive');
```

**Available Metrics**:
| Metric | Type | Description |
|--------|------|-------------|
| `archive_attempts_total` | Counter | Total archive attempts |
| `archive_successes_total` | Counter | Successful archives |
| `archive_failures_total` | Counter | Failed archives |
| `archive_duration_ms` | Histogram | Archive duration distribution |
| `active_operations` | Gauge | Currently running operations |

### 3. Tracer (`Tracer.ts`)

Distributed tracing for following operations through the plugin.

```typescript
import { Tracer, traced } from './monitoring';

const tracer = Tracer.getInstance();

// Manual tracing
async function archiveUrl(url: string) {
  const span = tracer.startTrace('archiveUrl');
  span.tag('url', url);

  try {
    const result = await doArchive(url);
    span.success();
    return result;
  } catch (error) {
    span.error(error);
    throw error;
  }
}

// Using trace helper
const result = await tracer.trace('archiveUrl', async (span) => {
  span.tag('url', url);
  return await doArchive(url);
}, { tags: { service: 'internetarchive' } });

// Decorator (for class methods)
class ArchiveService {
  @traced('InternetArchiveService.archive')
  async archive(items: Item[]) {
    // Method is automatically traced
  }
}
```

### 4. Health Checker (`HealthChecker.ts`)

Monitors archive service health based on metrics and circuit breaker state.

```typescript
import { HealthChecker, HealthStatus } from './monitoring';

const healthChecker = HealthChecker.getInstance();

// Initialize with services
healthChecker.init(['internetarchive', 'archivetoday', 'permacc']);
healthChecker.startPeriodicChecks();

// Check service health
const health = healthChecker.getServiceHealth('internetarchive');
if (health?.status === HealthStatus.UNHEALTHY) {
  // Use fallback service
}

// Get available services
const available = healthChecker.getAvailableServices();

// Get system health
const systemHealth = healthChecker.getSystemHealth();
console.log(`System status: ${systemHealth.status}`);
```

**Health Statuses**:
- `HEALTHY` - Success rate ≥95%, normal latency
- `DEGRADED` - Success rate 70-95% or high latency
- `UNHEALTHY` - Success rate <70% or circuit breaker open
- `UNKNOWN` - No recent activity

### 5. Alerting (`Alerting.ts`)

Local alerts for service issues shown via Zotero notifications.

```typescript
import { AlertingManager } from './monitoring';

const alerting = AlertingManager.getInstance();

// Start alerting
alerting.start();

// Add custom rule
alerting.addRule({
  id: 'permacc-quota',
  name: 'Perma.cc Quota Warning',
  description: 'Approaching monthly Perma.cc limit',
  condition: {
    metric: 'serviceAttempts',
    operator: '>=',
    threshold: 8,
    windowMs: 2592000000, // 30 days
    serviceId: 'permacc'
  },
  severity: 'warning',
  enabled: true,
  cooldownMs: 86400000 // 24 hours
});

// Get active alerts
const alerts = alerting.getActiveAlerts();
```

**Default Alert Rules**:
1. **High Failure Rate** - Success rate <50%
2. **Service Unhealthy** - Any service unhealthy
3. **High Latency** - Average >60s
4. **All Services Down** - No services available
5. **Circuit Breaker Open** - Service circuit tripped

### 6. Dashboard (`Dashboard.ts`)

Aggregates all monitoring data for display and reports.

```typescript
import { Dashboard, generateMonitoringReport } from './monitoring';

const dashboard = Dashboard.getInstance();

// Get complete dashboard data
const data = dashboard.getDashboardData();

// Generate text report
const report = generateMonitoringReport(86400000); // 24 hours
console.log(report);

// Get quick status
const status = dashboard.getQuickStatus();
if (status.status === 'error') {
  // Show warning to user
}

// Export all data for debugging
const exportData = dashboard.exportAll();
```

## Integration Example

```typescript
// In MomentO7.ts or bootstrap.ts

import {
  initializeMonitoring,
  shutdownMonitoring,
  recordArchiveOperation,
  Tracer,
  Logger
} from './monitoring';

// Initialize on startup
async function startup() {
  // ... other initialization

  initializeMonitoring([
    'internetarchive',
    'archivetoday',
    'permacc',
    'ukwebarchive',
    'arquivopt'
  ]);
}

// In archive coordinator
async function archiveItem(item: Item, serviceId: string) {
  const tracer = Tracer.getInstance();
  const startTime = Date.now();

  const result = await tracer.trace('archiveItem', async (span) => {
    span.tags({
      serviceId,
      itemId: item.id,
      url: item.getField('url')
    });

    // Do archive...
    return await service.archive([item]);
  });

  // Record metrics
  recordArchiveOperation({
    serviceId,
    url: item.getField('url'),
    success: result.success,
    duration: Date.now() - startTime,
    errorType: result.error?.type,
    httpStatus: result.error?.status,
    retryCount: 0,
    fromCache: false
  });

  return result;
}

// Cleanup on shutdown
function shutdown() {
  shutdownMonitoring();
}
```

## Accessing Monitoring Data

### Via Error Console

```javascript
// In Zotero Error Console (Tools → Developer → Error Console)

// Get quick status
Zotero.MomentO7.monitoring.getSystemStatus()

// Generate report
Zotero.MomentO7.monitoring.generateMonitoringReport()

// Export all data
Zotero.MomentO7.monitoring.exportMonitoringData()

// Get service health
Zotero.MomentO7.monitoring.HealthChecker.getInstance().getAllHealth()

// Get active alerts
Zotero.MomentO7.monitoring.AlertingManager.getInstance().getActiveAlerts()
```

### Programmatic Access

```typescript
import { Dashboard, Logger, MetricsRegistry } from './monitoring';

// Access logs
const logs = Logger.getInstance().getEntries({
  level: LogLevel.ERROR,
  since: Date.now() - 3600000
});

// Access metrics
const stats = MetricsRegistry.getInstance().getAggregatedStats(86400000);

// Generate report
const report = Dashboard.getInstance().generateReport();
```

## Configuration

### Logger Configuration

```typescript
Logger.getInstance().configure({
  minLevel: LogLevel.DEBUG,  // Show debug logs
  maxEntries: 2000,          // Keep more entries
  enableConsole: true,       // Output to Zotero console
  enablePersistence: true    // Save to storage
});
```

### Health Checker Configuration

```typescript
HealthChecker.getInstance({
  checkIntervalMs: 60000,     // Check every minute
  healthyThreshold: 0.9,      // 90% success = healthy
  degradedThreshold: 0.6,     // 60% success = degraded
  latencyThresholdMs: 45000,  // 45s = degraded
  windowMs: 1800000           // 30 minute window
});
```

### Alerting Configuration

```typescript
AlertingManager.getInstance({
  checkIntervalMs: 30000,      // Check every 30s
  maxAlerts: 200,              // Keep 200 alerts
  defaultCooldownMs: 600000,   // 10 min cooldown
  enableNotifications: true    // Show Zotero popups
});
```

## Best Practices

1. **Use Category Loggers** - Create specific loggers for each module
2. **Always Record Metrics** - Call `recordArchiveOperation()` for every archive attempt
3. **Use Tracing for Debugging** - Wrap complex operations in traces
4. **Monitor Health Before Operations** - Check `isServiceAvailable()` before archiving
5. **Handle Alerts Gracefully** - Don't spam users with notifications
6. **Export Data for Bug Reports** - Include monitoring export when reporting issues

## Privacy Considerations

- All data stays local to the user's machine
- No external telemetry or analytics
- URLs are stored only for diagnostic purposes
- Data can be cleared via `Logger.clear()`, `MetricsRegistry.reset()`, etc.
