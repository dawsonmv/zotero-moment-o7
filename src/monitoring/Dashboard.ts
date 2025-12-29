/**
 * Dashboard Data Provider for Zotero Moment-o7
 * Aggregates monitoring data for display and reporting
 */

import { DashboardData, MonitoringReport, ServiceHealth, HealthStatus } from './types';
import { Logger } from './Logger';
import { MetricsRegistry } from './Metrics';
import { Tracer } from './Tracer';
import { HealthChecker } from './HealthChecker';
import { AlertingManager } from './Alerting';

declare const Zotero: any;

/**
 * Dashboard provides aggregated monitoring data
 */
export class Dashboard {
  private static instance: Dashboard;
  private metrics: MetricsRegistry;
  private tracer: Tracer;
  private healthChecker: HealthChecker;
  private alerting: AlertingManager;

  private constructor() {
    this.metrics = MetricsRegistry.getInstance();
    this.tracer = Tracer.getInstance();
    this.healthChecker = HealthChecker.getInstance();
    this.alerting = AlertingManager.getInstance();
  }

  static getInstance(): Dashboard {
    if (!Dashboard.instance) {
      Dashboard.instance = new Dashboard();
    }
    return Dashboard.instance;
  }

  /**
   * Get complete dashboard data
   */
  getDashboardData(): DashboardData {
    const snapshot = this.metrics.getSnapshot();

    return {
      timestamp: Date.now(),
      services: this.healthChecker.getAllHealth(),
      recentArchives: this.metrics.getRecentArchives(20),
      alerts: this.alerting.getActiveAlerts(),
      stats: this.metrics.getAggregatedStats(86400000), // 24 hours
      systemHealth: {
        activeTraces: this.tracer.getRecentTraces(100).length,
        pendingOperations: snapshot.activeOperations
      }
    };
  }

  /**
   * Generate a comprehensive monitoring report
   */
  generateReport(periodMs: number = 86400000): MonitoringReport {
    const now = Date.now();
    const stats = this.metrics.getAggregatedStats(periodMs);
    const services = this.healthChecker.getAllHealth();
    const alerts = this.alerting.getAllAlerts({ since: now - periodMs });
    const snapshot = this.metrics.getSnapshot();

    // Find most used service
    let mostUsedService = 'none';
    let maxAttempts = 0;
    for (const [serviceId, data] of Object.entries(stats.serviceBreakdown)) {
      if (data.attempts > maxAttempts) {
        maxAttempts = data.attempts;
        mostUsedService = serviceId;
      }
    }

    // Find most common error
    let mostCommonError = 'none';
    let maxErrors = 0;
    for (const [errorType, count] of Object.entries(stats.errorBreakdown)) {
      if (count > maxErrors) {
        maxErrors = count;
        mostCommonError = errorType;
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, services, snapshot);

    return {
      generatedAt: now,
      reportPeriod: {
        start: stats.startTime,
        end: stats.endTime
      },
      summary: {
        totalArchiveAttempts: stats.archiveAttempts,
        successRate: stats.archiveAttempts > 0
          ? stats.archiveSuccesses / stats.archiveAttempts
          : 0,
        avgLatency: snapshot.avgDuration,
        mostUsedService,
        mostCommonError
      },
      serviceDetails: services,
      alerts,
      recommendations
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    stats: ReturnType<MetricsRegistry['getAggregatedStats']>,
    services: ServiceHealth[],
    snapshot: ReturnType<MetricsRegistry['getSnapshot']>
  ): string[] {
    const recommendations: string[] = [];

    // Success rate recommendations
    if (snapshot.successRate < 0.8) {
      recommendations.push(
        'Archive success rate is below 80%. Consider checking service availability ' +
        'and network connectivity.'
      );
    }

    // Latency recommendations
    if (snapshot.avgDuration > 30000) {
      recommendations.push(
        'Average archive time exceeds 30 seconds. This may indicate network issues ' +
        'or service congestion. Consider using multiple services in parallel.'
      );
    }

    // Service-specific recommendations
    const unhealthyServices = services.filter(s => s.status === HealthStatus.UNHEALTHY);
    if (unhealthyServices.length > 0) {
      recommendations.push(
        `${unhealthyServices.length} service(s) are unhealthy: ` +
        `${unhealthyServices.map(s => s.serviceId).join(', ')}. ` +
        'Consider using fallback services for archiving.'
      );
    }

    // Error-specific recommendations
    for (const [errorKey, count] of Object.entries(snapshot.errorBreakdown)) {
      if (count > 5) {
        if (errorKey.includes('RATE_LIMIT')) {
          recommendations.push(
            `Rate limiting detected for ${errorKey.split(':')[0]}. ` +
            'Consider spacing out archive requests or using alternative services.'
          );
        } else if (errorKey.includes('TIMEOUT')) {
          recommendations.push(
            `Timeout errors detected for ${errorKey.split(':')[0]}. ` +
            'Consider increasing timeout settings in preferences.'
          );
        } else if (errorKey.includes('BLOCKED')) {
          recommendations.push(
            `Some URLs are being blocked by ${errorKey.split(':')[0]}. ` +
            'Try using Archive.today as an alternative for these URLs.'
          );
        }
      }
    }

    // Activity recommendations
    if (stats.archiveAttempts === 0) {
      recommendations.push(
        'No archive activity in the reporting period. ' +
        'Ensure auto-archiving is enabled in preferences.'
      );
    }

    // Perma.cc quota check (if usage data available)
    const permaccStats = stats.serviceBreakdown['permacc'];
    if (permaccStats && permaccStats.attempts >= 8) {
      recommendations.push(
        'Perma.cc usage is approaching the free tier limit (10/month). ' +
        'Consider reserving it for important academic citations.'
      );
    }

    return recommendations;
  }

  /**
   * Get a quick status summary
   */
  getQuickStatus(): {
    status: 'ok' | 'degraded' | 'error';
    message: string;
    details: string[];
  } {
    const systemHealth = this.healthChecker.getSystemHealth();
    const activeAlerts = this.alerting.getActiveAlerts();
    const snapshot = this.metrics.getSnapshot();

    const details: string[] = [];
    let status: 'ok' | 'degraded' | 'error' = 'ok';
    let message = 'All systems operational';

    // Check for critical alerts
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      status = 'error';
      message = `${criticalAlerts.length} critical alert(s)`;
      details.push(...criticalAlerts.map(a => a.message));
    } else if (activeAlerts.length > 0) {
      status = 'degraded';
      message = `${activeAlerts.length} active alert(s)`;
    }

    // Check service health
    if (systemHealth.unhealthyCount > 0) {
      if (status !== 'error') {
        status = 'degraded';
        message = `${systemHealth.unhealthyCount} service(s) unhealthy`;
      }
      details.push(`Unhealthy services: ${systemHealth.unhealthyCount}/${systemHealth.healthyCount + systemHealth.degradedCount + systemHealth.unhealthyCount}`);
    }

    // Check success rate
    if (snapshot.successRate < 0.5 && snapshot.archiveAttempts > 0) {
      if (status !== 'error') {
        status = 'error';
        message = 'High failure rate';
      }
      details.push(`Success rate: ${(snapshot.successRate * 100).toFixed(1)}%`);
    } else if (snapshot.successRate < 0.8 && snapshot.archiveAttempts > 0) {
      if (status === 'ok') {
        status = 'degraded';
        message = 'Reduced success rate';
      }
      details.push(`Success rate: ${(snapshot.successRate * 100).toFixed(1)}%`);
    }

    return { status, message, details };
  }

  /**
   * Format report as text for display
   */
  formatReportAsText(report: MonitoringReport): string {
    const lines: string[] = [
      '════════════════════════════════════════════',
      '       MOMENT-O7 MONITORING REPORT          ',
      '════════════════════════════════════════════',
      '',
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `Period: ${new Date(report.reportPeriod.start).toLocaleDateString()} - ${new Date(report.reportPeriod.end).toLocaleDateString()}`,
      '',
      '── SUMMARY ──────────────────────────────────',
      `Total Archives: ${report.summary.totalArchiveAttempts}`,
      `Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`,
      `Avg Latency: ${(report.summary.avgLatency / 1000).toFixed(1)}s`,
      `Most Used: ${report.summary.mostUsedService}`,
      `Top Error: ${report.summary.mostCommonError}`,
      '',
      '── SERVICES ─────────────────────────────────'
    ];

    const statusIcon = (status: HealthStatus) => ({
      [HealthStatus.HEALTHY]: '✓',
      [HealthStatus.DEGRADED]: '⚠',
      [HealthStatus.UNHEALTHY]: '✗',
      [HealthStatus.UNKNOWN]: '?'
    }[status]);

    for (const service of report.serviceDetails) {
      lines.push(`${statusIcon(service.status)} ${service.serviceId.padEnd(20)} ${service.status.padEnd(10)} ${(service.successRate * 100).toFixed(0)}%`);
    }

    if (report.alerts.length > 0) {
      lines.push('');
      lines.push('── ALERTS ───────────────────────────────────');
      for (const alert of report.alerts.slice(0, 10)) {
        const severity = alert.severity.toUpperCase().padEnd(8);
        const resolved = alert.resolved ? '[RESOLVED]' : '[ACTIVE]';
        lines.push(`${severity} ${resolved} ${alert.message}`);
      }
      if (report.alerts.length > 10) {
        lines.push(`... and ${report.alerts.length - 10} more`);
      }
    }

    if (report.recommendations.length > 0) {
      lines.push('');
      lines.push('── RECOMMENDATIONS ──────────────────────────');
      for (const rec of report.recommendations) {
        lines.push(`• ${rec}`);
      }
    }

    lines.push('');
    lines.push('════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Export all monitoring data as JSON
   */
  exportAll(): string {
    return JSON.stringify({
      dashboard: this.getDashboardData(),
      report: this.generateReport(),
      logs: Logger.getInstance().export({ pretty: true }),
      traces: this.tracer.export(),
      metrics: this.metrics.export()
    }, null, 2);
  }
}
