/**
 * Health Checker for Archive Services
 * Monitors service availability and health status
 */

import { ServiceHealth, HealthStatus } from "./types";
import { MetricsRegistry } from "./Metrics";
import { Logger, CategoryLogger } from "./Logger";
import {
  CircuitBreakerManager,
  CircuitState,
} from "../../utils/CircuitBreaker";

declare const Zotero: any;

export interface HealthCheckConfig {
  checkIntervalMs: number;
  healthyThreshold: number; // Success rate to be considered healthy
  degradedThreshold: number; // Success rate to be considered degraded
  latencyThresholdMs: number; // Latency above this is degraded
  windowMs: number; // Time window for calculations
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  checkIntervalMs: 300000, // 5 minutes
  healthyThreshold: 0.95,
  degradedThreshold: 0.7,
  latencyThresholdMs: 30000,
  windowMs: 3600000, // 1 hour
};

/**
 * Health Checker monitors all archive services
 */
export class HealthChecker {
  private static instance: HealthChecker;
  private config: HealthCheckConfig;
  private logger: CategoryLogger;
  private metrics: MetricsRegistry;
  private circuitBreakers: CircuitBreakerManager;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private checkInterval?: ReturnType<typeof setInterval>;
  private lastCheck = 0;

  private constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = Logger.getInstance().child("HealthChecker");
    this.metrics = MetricsRegistry.getInstance();
    this.circuitBreakers = new CircuitBreakerManager();
  }

  static getInstance(config?: Partial<HealthCheckConfig>): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker(config);
    }
    return HealthChecker.instance;
  }

  /**
   * Initialize health checking for services
   */
  init(serviceIds: string[]): void {
    for (const serviceId of serviceIds) {
      this.serviceHealth.set(serviceId, {
        serviceId,
        status: HealthStatus.UNKNOWN,
        lastCheck: 0,
        successRate: 1,
        avgLatency: 0,
        circuitState: "CLOSED",
        errorCount: 0,
      });
    }

    this.logger.info("Health checker initialized", { services: serviceIds });
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, this.config.checkIntervalMs);

    // Initial check
    this.checkAllServices();
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Check health of all services
   */
  checkAllServices(): void {
    this.lastCheck = Date.now();

    for (const [serviceId] of this.serviceHealth) {
      this.updateServiceHealth(serviceId);
    }

    this.logger.debug("Health check complete", {
      services: this.serviceHealth.size,
      unhealthy: Array.from(this.serviceHealth.values())
        .filter((h) => h.status === HealthStatus.UNHEALTHY)
        .map((h) => h.serviceId),
    });
  }

  /**
   * Update health status for a single service
   */
  private updateServiceHealth(serviceId: string): void {
    const metrics = this.metrics.getServiceMetrics(serviceId);
    const circuitBreaker = this.circuitBreakers.getBreaker(serviceId);
    const circuitState = circuitBreaker.getState();

    // Calculate health status
    let status: HealthStatus;
    let message: string | undefined;

    if (circuitState.state === CircuitState.OPEN) {
      status = HealthStatus.UNHEALTHY;
      message = "Circuit breaker is open";
    } else if (metrics.successRate >= this.config.healthyThreshold) {
      if (metrics.avgDuration > this.config.latencyThresholdMs) {
        status = HealthStatus.DEGRADED;
        message = "High latency";
      } else {
        status = HealthStatus.HEALTHY;
      }
    } else if (metrics.successRate >= this.config.degradedThreshold) {
      status = HealthStatus.DEGRADED;
      message = `Success rate: ${(metrics.successRate * 100).toFixed(1)}%`;
    } else if (metrics.attempts === 0) {
      status = HealthStatus.UNKNOWN;
      message = "No recent activity";
    } else {
      status = HealthStatus.UNHEALTHY;
      message = `Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`;
    }

    const health: ServiceHealth = {
      serviceId,
      status,
      lastCheck: Date.now(),
      successRate: metrics.successRate,
      avgLatency: metrics.avgDuration,
      circuitState: circuitState.state,
      errorCount: metrics.failures,
      message,
    };

    this.serviceHealth.set(serviceId, health);

    // Log status changes
    const previousHealth = this.serviceHealth.get(serviceId);
    if (previousHealth && previousHealth.status !== status) {
      this.logger.notice(`Service health changed: ${serviceId}`, {
        from: previousHealth.status,
        to: status,
        message,
      });
    }
  }

  /**
   * Get health status for a service
   */
  getServiceHealth(serviceId: string): ServiceHealth | undefined {
    return this.serviceHealth.get(serviceId);
  }

  /**
   * Get all service health statuses
   */
  getAllHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Get only healthy services
   */
  getHealthyServices(): string[] {
    return Array.from(this.serviceHealth.entries())
      .filter(([_, health]) => health.status === HealthStatus.HEALTHY)
      .map(([id]) => id);
  }

  /**
   * Get services that are available (healthy or degraded)
   */
  getAvailableServices(): string[] {
    return Array.from(this.serviceHealth.entries())
      .filter(
        ([_, health]) =>
          health.status === HealthStatus.HEALTHY ||
          health.status === HealthStatus.DEGRADED,
      )
      .map(([id]) => id);
  }

  /**
   * Check if a service is available
   */
  isServiceAvailable(serviceId: string): boolean {
    const health = this.serviceHealth.get(serviceId);
    return (
      health !== undefined &&
      (health.status === HealthStatus.HEALTHY ||
        health.status === HealthStatus.DEGRADED ||
        health.status === HealthStatus.UNKNOWN)
    );
  }

  /**
   * Get circuit breaker manager for services
   */
  getCircuitBreakers(): CircuitBreakerManager {
    return this.circuitBreakers;
  }

  /**
   * Record a successful operation (updates health)
   */
  recordSuccess(serviceId: string): void {
    // Circuit breaker will be updated by MetricsRegistry
    this.updateServiceHealth(serviceId);
  }

  /**
   * Record a failed operation (updates health)
   */
  recordFailure(serviceId: string, _error?: Error): void {
    this.updateServiceHealth(serviceId);
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: HealthStatus;
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
    lastCheck: number;
  } {
    const healths = this.getAllHealth();
    const healthyCount = healths.filter(
      (h) => h.status === HealthStatus.HEALTHY,
    ).length;
    const degradedCount = healths.filter(
      (h) => h.status === HealthStatus.DEGRADED,
    ).length;
    const unhealthyCount = healths.filter(
      (h) => h.status === HealthStatus.UNHEALTHY,
    ).length;

    let status: HealthStatus;
    if (unhealthyCount === healths.length) {
      status = HealthStatus.UNHEALTHY;
    } else if (healthyCount === healths.length) {
      status = HealthStatus.HEALTHY;
    } else if (unhealthyCount > 0 || degradedCount > 0) {
      status = HealthStatus.DEGRADED;
    } else {
      status = HealthStatus.UNKNOWN;
    }

    return {
      status,
      healthyCount,
      degradedCount,
      unhealthyCount,
      lastCheck: this.lastCheck,
    };
  }

  /**
   * Generate health report
   */
  generateReport(): string {
    const systemHealth = this.getSystemHealth();
    const services = this.getAllHealth();

    const lines = [
      "=== Moment-o7 Health Report ===",
      `Generated: ${new Date().toISOString()}`,
      `System Status: ${systemHealth.status.toUpperCase()}`,
      `  Healthy: ${systemHealth.healthyCount}`,
      `  Degraded: ${systemHealth.degradedCount}`,
      `  Unhealthy: ${systemHealth.unhealthyCount}`,
      "",
      "--- Service Details ---",
    ];

    for (const service of services) {
      const statusIcon = {
        [HealthStatus.HEALTHY]: "✓",
        [HealthStatus.DEGRADED]: "⚠",
        [HealthStatus.UNHEALTHY]: "✗",
        [HealthStatus.UNKNOWN]: "?",
      }[service.status];

      lines.push(`${statusIcon} ${service.serviceId}`);
      lines.push(`    Status: ${service.status}`);
      lines.push(
        `    Success Rate: ${(service.successRate * 100).toFixed(1)}%`,
      );
      lines.push(`    Avg Latency: ${service.avgLatency.toFixed(0)}ms`);
      lines.push(`    Circuit: ${service.circuitState}`);
      if (service.message) {
        lines.push(`    Note: ${service.message}`);
      }
    }

    return lines.join("\n");
  }
}
