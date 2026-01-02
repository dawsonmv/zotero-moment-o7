/**
 * Traffic Monitor - Measures archive service response times and detects service jamming
 *
 * Monitors HTTP request duration to calculate traffic scores for each archive service.
 * Detects when services are "jammed" (responding too slowly) and prevents their use
 * for the remainder of a batch operation.
 *
 * Traffic Score Calculation:
 * - Timing starts 1 second AFTER request initiated (delayed start)
 * - Score = duration_seconds × 0.1
 * - Example: 12s total duration - 1s delay = 11s active = 1.1 score
 *
 * Jamming Detection:
 * - Service is "jammed" if any single transfer scores >= 2.0
 * - Jammed services are skipped for remainder of batch
 * - State resets per batch operation
 */

export class TrafficMonitor {
  private static instance: TrafficMonitor;

  // Request timing state: requestId → { startTime, serviceId }
  private requestTimers: Map<string, { startTime: number; serviceId: string }> =
    new Map();

  // Service scores: serviceId → [score1, score2, ...] (valid scores only)
  private serviceScores: Map<string, number[]> = new Map();

  // Services that have exceeded jamming threshold in current batch
  private jammedServices: Set<string> = new Set();

  // Timestamp when batch started (for stale timer cleanup)
  private batchStartTime: number = Date.now();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TrafficMonitor {
    if (!TrafficMonitor.instance) {
      TrafficMonitor.instance = new TrafficMonitor();
    }
    return TrafficMonitor.instance;
  }

  /**
   * Start tracking a request (called after 1 second delay)
   */
  startRequest(requestId: string, serviceId: string, url: string): void {
    this.requestTimers.set(requestId, {
      startTime: Date.now(),
      serviceId,
    });

    Zotero.debug(
      `MomentO7 Traffic: Start tracking ${serviceId} (${requestId}) - ${url}`,
    );
  }

  /**
   * End tracking a request and calculate score
   */
  endRequest(requestId: string, success: boolean): void {
    const timer = this.requestTimers.get(requestId);
    if (!timer) {
      // Request completed < 1s, no score recorded
      return;
    }

    const { startTime, serviceId } = timer;
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const score = duration * 0.1;

    // Clean up timer entry
    this.requestTimers.delete(requestId);

    // Check if service is now jammed
    if (score >= 2.0) {
      this.jammedServices.add(serviceId);
      Zotero.debug(
        `MomentO7 Traffic: SERVICE JAMMED ${serviceId} (score: ${score.toFixed(2)})`,
      );
    }

    // Store valid scores only (exclude null, undefined, false, 0)
    if (score && score > 0 && isFinite(score)) {
      if (!this.serviceScores.has(serviceId)) {
        this.serviceScores.set(serviceId, []);
      }
      this.serviceScores.get(serviceId)!.push(score);

      Zotero.debug(
        `MomentO7 Traffic: ${serviceId} score=${score.toFixed(2)} mean=${this.getMeanScore(serviceId).toFixed(2)}`,
      );
    }
  }

  /**
   * Get mean traffic score for a service (exclude invalid scores)
   */
  getMeanScore(serviceId: string): number {
    const scores = this.serviceScores.get(serviceId);
    if (!scores || scores.length === 0) {
      return 0;
    }

    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length;
  }

  /**
   * Check if a service is jammed for this batch
   */
  isServiceJammed(serviceId: string): boolean {
    return this.jammedServices.has(serviceId);
  }

  /**
   * Get formatted traffic summary for ProgressWindow headline
   * Example: "IA: 1.2 | AT: 0.8 | PC: JAMMED"
   */
  getTrafficSummary(): string {
    const summaryParts: string[] = [];

    // Get all services that have been attempted in this batch
    const allServices = new Set<string>();
    this.serviceScores.forEach((_, serviceId) => allServices.add(serviceId));
    this.jammedServices.forEach((serviceId) => allServices.add(serviceId));

    // Sort for consistent display
    const sortedServices = Array.from(allServices).sort();

    for (const serviceId of sortedServices) {
      if (this.jammedServices.has(serviceId)) {
        summaryParts.push(`${this.getServiceShortName(serviceId)}: JAMMED`);
      } else {
        const mean = this.getMeanScore(serviceId);
        if (mean > 0) {
          summaryParts.push(
            `${this.getServiceShortName(serviceId)}: ${mean.toFixed(1)}`,
          );
        }
      }
    }

    return summaryParts.length > 0 ? summaryParts.join(" | ") : "No traffic data";
  }

  /**
   * Get service short name for display
   */
  private getServiceShortName(serviceId: string): string {
    const shortNames: Record<string, string> = {
      internetarchive: "IA",
      archivetoday: "AT",
      permacc: "PC",
      ukwebarchive: "UWA",
      arquivopt: "APT",
    };
    return shortNames[serviceId] || serviceId.substring(0, 3).toUpperCase();
  }

  /**
   * Reset all batch-scoped state for new batch operation
   */
  resetBatch(): void {
    Zotero.debug("MomentO7 Traffic: Reset batch state");

    // Clear timers
    this.requestTimers.clear();

    // Clear service scores
    this.serviceScores.clear();

    // Clear jammed services
    this.jammedServices.clear();

    // Reset batch start time
    this.batchStartTime = Date.now();
  }

  /**
   * Clean up stale timers (requests that never completed)
   * Called periodically to prevent memory leaks
   */
  private cleanupStaleTimers(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    let staleCount = 0;
    for (const [requestId, timer] of this.requestTimers.entries()) {
      if (now - timer.startTime > maxAge) {
        this.requestTimers.delete(requestId);
        staleCount++;
      }
    }

    if (staleCount > 0) {
      Zotero.debug(`MomentO7 Traffic: Cleaned up ${staleCount} stale timers`);
    }
  }

  /**
   * Get traffic statistics for a service (for metrics/dashboard)
   */
  getServiceStats(serviceId: string): {
    mean: number;
    min: number;
    max: number;
    count: number;
    isJammed: boolean;
  } {
    const scores = this.serviceScores.get(serviceId) || [];
    const isJammed = this.jammedServices.has(serviceId);

    if (scores.length === 0) {
      return {
        mean: 0,
        min: 0,
        max: 0,
        count: 0,
        isJammed,
      };
    }

    return {
      mean: scores.reduce((a, b) => a + b, 0) / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
      count: scores.length,
      isJammed,
    };
  }

  /**
   * Get all jammedservices in current batch
   */
  getJammedServices(): string[] {
    return Array.from(this.jammedServices);
  }

  /**
   * Export state for debugging
   */
  getDebugState(): {
    activeRequests: number;
    jammedCount: number;
    batchAge: number;
    services: Record<string, any>;
  } {
    const services: Record<string, any> = {};

    // Collect all services mentioned in scores or jammed
    const allServices = new Set<string>();
    this.serviceScores.forEach((_, id) => allServices.add(id));
    this.jammedServices.forEach((id) => allServices.add(id));

    for (const serviceId of allServices) {
      services[serviceId] = this.getServiceStats(serviceId);
    }

    return {
      activeRequests: this.requestTimers.size,
      jammedCount: this.jammedServices.size,
      batchAge: Date.now() - this.batchStartTime,
      services,
    };
  }
}
