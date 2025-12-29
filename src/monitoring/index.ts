/**
 * Monitoring Module - Central Export
 * Provides observability for Zotero Moment-o7 plugin
 */

// Types
export * from './types';

// Core components
export { Logger, CategoryLogger, createServiceLogger, createArchiveLogger, createMementoLogger } from './Logger';
export { MetricsRegistry, Counter, Gauge, Histogram, Timer } from './Metrics';
export { Tracer, SpanBuilder, traced } from './Tracer';
export { HealthChecker } from './HealthChecker';
export { AlertingManager } from './Alerting';
export { Dashboard } from './Dashboard';

// Re-export for convenience
import { Logger } from './Logger';
import { MetricsRegistry } from './Metrics';
import { Tracer } from './Tracer';
import { HealthChecker } from './HealthChecker';
import { AlertingManager } from './Alerting';
import { Dashboard } from './Dashboard';
import { LogLevel, ArchiveMetrics } from './types';

/**
 * Initialize all monitoring components
 */
export function initializeMonitoring(serviceIds: string[]): void {
  // Initialize logger
  Logger.getInstance();

  // Initialize metrics
  MetricsRegistry.getInstance();

  // Initialize tracer
  Tracer.getInstance();

  // Initialize health checker with services
  const healthChecker = HealthChecker.getInstance();
  healthChecker.init(serviceIds);
  healthChecker.startPeriodicChecks();

  // Initialize alerting
  const alerting = AlertingManager.getInstance();
  alerting.start();

  Logger.getInstance().info('Monitoring', 'Monitoring system initialized', {
    services: serviceIds
  });
}

/**
 * Shutdown monitoring (cleanup)
 */
export function shutdownMonitoring(): void {
  HealthChecker.getInstance().stopPeriodicChecks();
  AlertingManager.getInstance().stop();

  Logger.getInstance().info('Monitoring', 'Monitoring system shutdown');
}

/**
 * Quick helper to record an archive operation
 */
export function recordArchiveOperation(metrics: ArchiveMetrics): void {
  MetricsRegistry.getInstance().recordArchive(metrics);

  const healthChecker = HealthChecker.getInstance();
  if (metrics.success) {
    healthChecker.recordSuccess(metrics.serviceId);
  } else {
    healthChecker.recordFailure(metrics.serviceId);
  }

  Logger.getInstance().log(
    metrics.success ? LogLevel.INFO : LogLevel.WARNING,
    'Archive',
    metrics.success ? 'Archive succeeded' : 'Archive failed',
    {
      serviceId: metrics.serviceId,
      duration: metrics.duration,
      success: metrics.success,
      errorType: metrics.errorType
    }
  );
}

/**
 * Get quick system status
 */
export function getSystemStatus(): {
  status: 'ok' | 'degraded' | 'error';
  message: string;
  details: string[];
} {
  return Dashboard.getInstance().getQuickStatus();
}

/**
 * Generate monitoring report
 */
export function generateMonitoringReport(periodMs?: number): string {
  const dashboard = Dashboard.getInstance();
  const report = dashboard.generateReport(periodMs);
  return dashboard.formatReportAsText(report);
}

/**
 * Export all monitoring data for debugging
 */
export function exportMonitoringData(): string {
  return Dashboard.getInstance().exportAll();
}
