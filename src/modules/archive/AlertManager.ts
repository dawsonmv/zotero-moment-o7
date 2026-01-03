/**
 * Alert manager for notifying users of service failures and state changes
 * Handles alert deduplication, history tracking, and multi-channel delivery
 */

import {
  Alert,
  AlertChannel,
  AlertLevel,
  AlertPreferences,
  AlertThresholds,
  ActivityEvent,
  ActivityEventType,
  ActivityFilterOptions,
} from "./types";

export class AlertManager {
  private static instance: AlertManager;
  private alertHistory: Map<string, Alert> = new Map();
  private lastAlertTime: Map<string, number> = new Map(); // Key: alert identifier
  private failureTracker: Map<string, number[]> = new Map(); // Timestamps of failures
  private activityHistory: Map<string, ActivityEvent> = new Map(); // Activity audit trail
  private maxActivityHistorySize: number = 500; // Keep recent activities for audit
  private preferences: AlertPreferences = {
    enabled: true,
    channels: [AlertChannel.Log, AlertChannel.Zotero],
    level: AlertLevel.Warning,
    thresholds: {
      failureCount: 3,
      failureWindow: 300000, // 5 minutes
      circuitBreakerStateChange: true,
      minAlertInterval: 60000, // 1 minute between same alert
    },
    maxHistorySize: 100,
  };

  private constructor() {}

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Create and send an alert
   */
  createAlert(
    title: string,
    message: string,
    level: AlertLevel = AlertLevel.Warning,
    serviceId?: string,
    details?: any,
  ): Alert | null {
    if (!this.preferences.enabled) {
      return null;
    }

    // Check alert level threshold
    if (!this.isLevelEnabled(level)) {
      return null;
    }

    // Check deduplication
    const alertKey = this.getAlertKey(serviceId, title);
    if (!this.shouldSendAlert(alertKey)) {
      Zotero.debug(
        `MomentO7: Alert deduplicated (${alertKey}), too soon since last alert`,
      );
      return null;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      level,
      channel: this.preferences.channels[0] || AlertChannel.Log,
      title,
      message,
      serviceId,
      details,
      acknowledged: false,
    };

    // Add to history
    this.addToHistory(alert);

    // Update last alert time
    this.lastAlertTime.set(alertKey, Date.now());

    // Send through configured channels
    this.sendAlert(alert);

    return alert;
  }

  /**
   * Track failure for threshold-based alerting
   */
  trackFailure(serviceId: string): void {
    const key = serviceId;
    if (!this.failureTracker.has(key)) {
      this.failureTracker.set(key, []);
    }

    const failures = this.failureTracker.get(key)!;
    const now = Date.now();
    failures.push(now);

    // Clean up old failures outside the window
    const window = this.preferences.thresholds.failureWindow || 300000;
    const validFailures = failures.filter(
      (timestamp) => now - timestamp < window,
    );
    this.failureTracker.set(key, validFailures);

    // Check if threshold exceeded
    const threshold = this.preferences.thresholds.failureCount || 3;
    if (validFailures.length >= threshold) {
      this.createAlert(
        `Service Threshold Exceeded`,
        `${serviceId} has failed ${validFailures.length} times in the last ${Math.round(window / 1000)} seconds`,
        AlertLevel.Error,
        serviceId,
        { failureCount: validFailures.length, window },
      );

      // Reset tracker after alert
      this.failureTracker.set(key, []);
    }
  }

  /**
   * Alert on circuit breaker state change
   */
  alertCircuitBreakerChange(
    serviceId: string,
    oldState: string,
    newState: string,
  ): void {
    if (!this.preferences.thresholds.circuitBreakerStateChange) {
      return;
    }

    const level = newState === "OPEN" ? AlertLevel.Error : AlertLevel.Warning;
    this.createAlert(
      `Circuit Breaker State Change`,
      `${serviceId} circuit breaker transitioned from ${oldState} to ${newState}`,
      level,
      serviceId,
      { oldState, newState },
    );
  }

  /**
   * Get alert history
   */
  getHistory(): Alert[] {
    return Array.from(this.alertHistory.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Get alerts for a specific service
   */
  getServiceAlerts(serviceId: string): Alert[] {
    return this.getHistory().filter((a) => a.serviceId === serviceId);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.getHistory().filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alertHistory.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory.clear();
  }

  /**
   * Set alert preferences
   */
  setPreferences(preferences: Partial<AlertPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  /**
   * Get current preferences
   */
  getPreferences(): AlertPreferences {
    return this.preferences;
  }

  /**
   * Reset failure tracker for a service
   */
  resetFailureTracker(serviceId: string): void {
    this.failureTracker.delete(serviceId);
  }

  /**
   * Get failure count for a service
   */
  getFailureCount(serviceId: string): number {
    const failures = this.failureTracker.get(serviceId) || [];
    const now = Date.now();
    const window = this.preferences.thresholds.failureWindow || 300000;

    return failures.filter((timestamp) => now - timestamp < window).length;
  }

  // Private helpers

  private isLevelEnabled(level: AlertLevel): boolean {
    const levelOrder = [
      AlertLevel.Info,
      AlertLevel.Warning,
      AlertLevel.Error,
      AlertLevel.Critical,
    ];
    const thresholdIndex = levelOrder.indexOf(this.preferences.level);
    const levelIndex = levelOrder.indexOf(level);

    return levelIndex >= thresholdIndex;
  }

  private getAlertKey(serviceId: string | undefined, title: string): string {
    return `${serviceId || "global"}:${title}`;
  }

  private shouldSendAlert(key: string): boolean {
    const lastTime = this.lastAlertTime.get(key);
    if (!lastTime) {
      return true;
    }

    const minInterval = this.preferences.thresholds.minAlertInterval || 60000;
    return Date.now() - lastTime >= minInterval;
  }

  private addToHistory(alert: Alert): void {
    this.alertHistory.set(alert.id, alert);

    // Trim history if exceeds max size
    const maxSize = this.preferences.maxHistorySize || 100;
    if (this.alertHistory.size > maxSize) {
      const allAlerts = Array.from(this.alertHistory.values()).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Remove oldest alerts
      const toRemove = allAlerts.slice(0, allAlerts.length - maxSize);
      toRemove.forEach((a) => this.alertHistory.delete(a.id));
    }
  }

  private sendAlert(alert: Alert): void {
    // Log alert
    if (
      this.preferences.channels.includes(AlertChannel.Log) ||
      alert.channel === AlertChannel.Log
    ) {
      const levelStr = alert.level.toUpperCase();
      Zotero.debug(`MomentO7 [${levelStr}]: ${alert.title} - ${alert.message}`);
    }

    // Zotero notification (non-intrusive popup)
    if (
      this.preferences.channels.includes(AlertChannel.Zotero) ||
      alert.channel === AlertChannel.Zotero
    ) {
      this.sendZoteroNotification(alert);
    }

    // UI alerts can be added later when UI infrastructure is available
    if (alert.channel === AlertChannel.UI) {
      // Placeholder for future UI alert handling
      Zotero.debug(`MomentO7: [UI Alert] ${alert.title}`);
    }
  }

  private sendZoteroNotification(alert: Alert): void {
    try {
      // Graceful degradation if Zotero notification API not available
      if (
        typeof Zotero !== "undefined" &&
        Zotero.ProgressWindow &&
        !this.preferences.enabled
      ) {
        return;
      }

      // Create notification through Zotero UI if available
      // This is a placeholder - actual Zotero notification would go here
      if (typeof Zotero !== "undefined") {
        Zotero.debug(
          `MomentO7 [NOTIFICATION]: ${alert.title}: ${alert.message}`,
        );
      }
    } catch (error) {
      // Gracefully degrade if notification fails
      Zotero.debug(`MomentO7: Failed to send Zotero notification: ${error}`);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics for a specific service
   */
  getServiceStatistics(serviceId: string): {
    serviceId: string;
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    errorAlerts: number;
    currentFailureCount: number;
    lastAlertTime?: string;
  } {
    const serviceAlerts = this.getServiceAlerts(serviceId);
    const activeAlerts = serviceAlerts.filter((a) => !a.acknowledged);
    const criticalAlerts = serviceAlerts.filter(
      (a) => a.level === AlertLevel.Critical,
    );
    const errorAlerts = serviceAlerts.filter(
      (a) => a.level === AlertLevel.Error,
    );

    const lastAlert =
      serviceAlerts.length > 0 ? serviceAlerts[0].timestamp : undefined;

    return {
      serviceId,
      totalAlerts: serviceAlerts.length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      errorAlerts: errorAlerts.length,
      currentFailureCount: this.getFailureCount(serviceId),
      lastAlertTime: lastAlert,
    };
  }

  /**
   * Get statistics for all services with alerts
   */
  getAllServiceStatistics(): Array<{
    serviceId: string;
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    errorAlerts: number;
    currentFailureCount: number;
    lastAlertTime?: string;
  }> {
    const uniqueServices = new Set<string>();

    // Collect all services from alerts
    for (const alert of this.getHistory()) {
      if (alert.serviceId) {
        uniqueServices.add(alert.serviceId);
      }
    }

    // Collect all services from failure tracker
    for (const serviceId of this.failureTracker.keys()) {
      uniqueServices.add(serviceId);
    }

    return Array.from(uniqueServices)
      .map((serviceId) => this.getServiceStatistics(serviceId))
      .sort((a, b) => b.activeAlerts - a.activeAlerts); // Sort by active alert count
  }

  /**
   * Track an archiving activity for audit trail
   */
  trackActivity(event: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent {
    const activity: ActivityEvent = {
      ...event,
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.activityHistory.set(activity.id, activity);

    // Trim activity history if exceeds max size
    if (this.activityHistory.size > this.maxActivityHistorySize) {
      const allActivities = Array.from(this.activityHistory.values()).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Remove oldest activities
      const toRemove = allActivities.slice(
        0,
        allActivities.length - this.maxActivityHistorySize,
      );
      toRemove.forEach((a) => this.activityHistory.delete(a.id));
    }

    return activity;
  }

  /**
   * Get activity history
   */
  getActivityHistory(limit?: number): ActivityEvent[] {
    const activities = Array.from(this.activityHistory.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return limit ? activities.slice(0, limit) : activities;
  }

  /**
   * Get activities for a specific service
   */
  getServiceActivity(serviceId: string, limit?: number): ActivityEvent[] {
    const activities = this.getActivityHistory().filter(
      (a) => a.serviceId === serviceId,
    );

    return limit ? activities.slice(0, limit) : activities;
  }

  /**
   * Clear activity history
   */
  clearActivityHistory(): void {
    this.activityHistory.clear();
  }

  /**
   * Filter activities by advanced criteria
   */
  filterActivities(options: ActivityFilterOptions): ActivityEvent[] {
    let activities = Array.from(this.activityHistory.values());

    // Filter by time range
    if (options.startTime) {
      activities = activities.filter(
        (a) => new Date(a.timestamp).getTime() >= options.startTime!,
      );
    }
    if (options.endTime) {
      activities = activities.filter(
        (a) => new Date(a.timestamp).getTime() <= options.endTime!,
      );
    }

    // Filter by event types
    if (options.types && options.types.length > 0) {
      activities = activities.filter((a) => options.types!.includes(a.type));
    }

    // Filter by services
    if (options.services && options.services.length > 0) {
      activities = activities.filter(
        (a) => a.serviceId && options.services!.includes(a.serviceId),
      );
    }

    // Filter by result status
    if (options.results && options.results.length > 0) {
      activities = activities.filter(
        (a) => a.result && options.results!.includes(a.result),
      );
    }

    // Search by text
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      activities = activities.filter((a) => {
        const message = (a.message || "").toLowerCase();
        const itemTitle = (a.itemTitle || "").toLowerCase();
        const url = (a.url || "").toLowerCase();
        return (
          message.includes(searchLower) ||
          itemTitle.includes(searchLower) ||
          url.includes(searchLower)
        );
      });
    }

    // Sort by timestamp (newest first)
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Apply limit
    if (options.limit) {
      activities = activities.slice(0, options.limit);
    }

    return activities;
  }

  /**
   * Get activity statistics
   */
  getActivityStatistics(): {
    totalActivities: number;
    byType: Record<string, number>;
    byService: Record<string, number>;
    byResult: Record<string, number>;
  } {
    const activities = Array.from(this.activityHistory.values());
    const byType: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const byResult: Record<string, number> = {};

    for (const activity of activities) {
      // Count by type
      byType[activity.type] = (byType[activity.type] || 0) + 1;

      // Count by service
      if (activity.serviceId) {
        byService[activity.serviceId] =
          (byService[activity.serviceId] || 0) + 1;
      }

      // Count by result
      if (activity.result) {
        byResult[activity.result] = (byResult[activity.result] || 0) + 1;
      }
    }

    return {
      totalActivities: activities.length,
      byType,
      byService,
      byResult,
    };
  }

  /**
   * Get metrics aggregated by time period
   */
  getMetricsByPeriod(periodMs: number): {
    period: { start: string; end: string };
    successCount: number;
    failureCount: number;
    skippedCount: number;
    totalAttempts: number;
    successRate: number;
    byService: Record<
      string,
      {
        attempts: number;
        successes: number;
        failures: number;
        successRate: number;
      }
    >;
  } {
    const now = Date.now();
    const startTime = now - periodMs;
    const activities = Array.from(this.activityHistory.values()).filter(
      (a) => new Date(a.timestamp).getTime() >= startTime,
    );

    const byService: Record<
      string,
      {
        attempts: number;
        successes: number;
        failures: number;
        successRate: number;
      }
    > = {};
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const activity of activities) {
      // Only count actual archive activities
      if (
        activity.type !== ActivityEventType.ArchiveAttempt &&
        activity.type !== ActivityEventType.ArchiveSuccess &&
        activity.type !== ActivityEventType.ArchiveFailure
      ) {
        continue;
      }

      if (activity.serviceId) {
        if (!byService[activity.serviceId]) {
          byService[activity.serviceId] = {
            attempts: 0,
            successes: 0,
            failures: 0,
            successRate: 0,
          };
        }
        byService[activity.serviceId].attempts += 1;
      }

      if (activity.result === "success") {
        successCount += 1;
        if (activity.serviceId) {
          byService[activity.serviceId].successes += 1;
        }
      } else if (activity.result === "failure") {
        failureCount += 1;
        if (activity.serviceId) {
          byService[activity.serviceId].failures += 1;
        }
      } else if (activity.result === "skipped") {
        skippedCount += 1;
      }
    }

    // Calculate success rates
    const totalAttempts = successCount + failureCount;
    const successRate =
      totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    for (const serviceId in byService) {
      const service = byService[serviceId];
      const serviceTotal = service.successes + service.failures;
      service.successRate =
        serviceTotal > 0 ? (service.successes / serviceTotal) * 100 : 0;
    }

    return {
      period: {
        start: new Date(startTime).toISOString(),
        end: new Date(now).toISOString(),
      },
      successCount,
      failureCount,
      skippedCount,
      totalAttempts,
      successRate,
      byService,
    };
  }

  /**
   * Get hourly metrics for dashboard trends
   */
  getHourlyMetrics(hoursBack: number = 24): Array<{
    hour: string;
    successCount: number;
    failureCount: number;
    totalAttempts: number;
    successRate: number;
  }> {
    const hourMetrics: Record<
      string,
      { successCount: number; failureCount: number }
    > = {};
    const now = Date.now();

    // Initialize all hours
    for (let i = hoursBack - 1; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const date = new Date(hourStart);
      const hourKey = date.toISOString().substring(0, 13); // Format: YYYY-MM-DDTHH
      hourMetrics[hourKey] = { successCount: 0, failureCount: 0 };
    }

    // Aggregate activities by hour
    const activities = Array.from(this.activityHistory.values());
    for (const activity of activities) {
      if (
        activity.type !== ActivityEventType.ArchiveSuccess &&
        activity.type !== ActivityEventType.ArchiveFailure
      ) {
        continue;
      }

      const date = new Date(activity.timestamp);
      const hourKey = date.toISOString().substring(0, 13);

      if (hourMetrics[hourKey]) {
        if (activity.result === "success") {
          hourMetrics[hourKey].successCount += 1;
        } else if (activity.result === "failure") {
          hourMetrics[hourKey].failureCount += 1;
        }
      }
    }

    // Convert to array and calculate rates
    return Object.entries(hourMetrics).map(([hour, metrics]) => {
      const total = metrics.successCount + metrics.failureCount;
      return {
        hour,
        successCount: metrics.successCount,
        failureCount: metrics.failureCount,
        totalAttempts: total,
        successRate: total > 0 ? (metrics.successCount / total) * 100 : 0,
      };
    });
  }

  /**
   * Export audit report with current system state
   */
  exportAuditReport(): {
    timestamp: string;
    summary: {
      totalAlerts: number;
      activeAlerts: number;
      acknowledgedAlerts: number;
      preferences: AlertPreferences;
    };
    alerts: Alert[];
    failureTracking: Record<string, number>;
    serviceStatistics: Array<{
      serviceId: string;
      totalAlerts: number;
      activeAlerts: number;
      criticalAlerts: number;
      errorAlerts: number;
      currentFailureCount: number;
      lastAlertTime?: string;
    }>;
    activityHistory: ActivityEvent[];
  } {
    const alerts = this.getHistory();
    const acknowledgedAlerts = alerts.filter((a) => a.acknowledged);
    const activeAlerts = alerts.filter((a) => !a.acknowledged);

    const failureTracking: Record<string, number> = {};
    for (const [serviceId, timestamps] of this.failureTracker.entries()) {
      failureTracking[serviceId] = this.getFailureCount(serviceId);
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalAlerts: alerts.length,
        activeAlerts: activeAlerts.length,
        acknowledgedAlerts: acknowledgedAlerts.length,
        preferences: this.getPreferences(),
      },
      alerts: alerts,
      failureTracking,
      serviceStatistics: this.getAllServiceStatistics(),
      activityHistory: this.getActivityHistory(100), // Include last 100 activities
    };
  }
}
