/**
 * Health check utility for monitoring archive service availability
 * Performs non-intrusive health checks on all registered archive services
 */

import { HealthCheckResult, HealthStatus, HealthCheckOptions } from "./types";
import { ServiceRegistry } from "./ServiceRegistry";

export class HealthChecker {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly HEALTH_CHECK_CACHE_KEY = "healthCheckCache";
  private static cacheResults: Map<string, HealthCheckResult> = new Map();

  /**
   * Check health of a single service
   */
  static async checkService(
    serviceId: string,
    options: HealthCheckOptions = {},
  ): Promise<HealthCheckResult> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const registry = ServiceRegistry.getInstance();
    const service = registry.get(serviceId);

    if (!service) {
      return {
        serviceId,
        serviceName: "Unknown",
        status: HealthStatus.Unknown,
        lastChecked: new Date().toISOString(),
        message: `Service ${serviceId} not found in registry`,
      };
    }

    const startTime = Date.now();

    try {
      // Use isAvailable() as the health check indicator
      // This is non-intrusive and already implemented on all services
      const isAvailable = await Promise.race([
        service.isAvailable(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), timeout),
        ),
      ]);

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        serviceId,
        serviceName: service.name,
        status: isAvailable ? HealthStatus.Healthy : HealthStatus.Unhealthy,
        responseTime,
        lastChecked: new Date().toISOString(),
        message: isAvailable
          ? `${service.name} is available`
          : `${service.name} is not available`,
      };

      if (options.includeDetails) {
        result.details = {
          responseTimeMs: responseTime,
          checkedAt: new Date().toISOString(),
        };
      }

      // Cache the result
      this.cacheResults.set(serviceId, result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      const result: HealthCheckResult = {
        serviceId,
        serviceName: service.name,
        status: HealthStatus.Unhealthy,
        responseTime,
        lastChecked: new Date().toISOString(),
        message: `Health check failed: ${errorMessage}`,
      };

      if (options.includeDetails) {
        result.details = {
          error: errorMessage,
          responseTimeMs: responseTime,
        };
      }

      // Cache the result
      this.cacheResults.set(serviceId, result);
      return result;
    }
  }

  /**
   * Check health of all available services in parallel
   */
  static async checkAllServices(
    options: HealthCheckOptions = {},
  ): Promise<HealthCheckResult[]> {
    const registry = ServiceRegistry.getInstance();
    const services = await registry.getAvailable();

    const promises = services.map(({ id }) => this.checkService(id, options));
    return Promise.all(promises);
  }

  /**
   * Get cached health check result for a service
   */
  static getCachedResult(serviceId: string): HealthCheckResult | null {
    return this.cacheResults.get(serviceId) || null;
  }

  /**
   * Get all cached health check results
   */
  static getAllCachedResults(): HealthCheckResult[] {
    return Array.from(this.cacheResults.values());
  }

  /**
   * Clear health check cache
   */
  static clearCache(): void {
    this.cacheResults.clear();
  }

  /**
   * Check if any service is unhealthy
   */
  static hasUnhealthyServices(): boolean {
    return Array.from(this.cacheResults.values()).some(
      (result) => result.status === HealthStatus.Unhealthy,
    );
  }

  /**
   * Get count of healthy services
   */
  static getHealthyCount(): number {
    return Array.from(this.cacheResults.values()).filter(
      (result) => result.status === HealthStatus.Healthy,
    ).length;
  }

  /**
   * Get summary of health status
   */
  static getSummary(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    lastUpdated: string;
  } {
    const results = Array.from(this.cacheResults.values());

    return {
      healthy: results.filter((r) => r.status === HealthStatus.Healthy).length,
      degraded: results.filter((r) => r.status === HealthStatus.Degraded)
        .length,
      unhealthy: results.filter((r) => r.status === HealthStatus.Unhealthy)
        .length,
      unknown: results.filter((r) => r.status === HealthStatus.Unknown).length,
      lastUpdated:
        results.length > 0
          ? new Date(
              Math.max(
                ...results.map((r) => new Date(r.lastChecked).getTime()),
              ),
            ).toISOString()
          : new Date().toISOString(),
    };
  }
}
