/**
 * Alerting System for Zotero Moment-o7
 * Provides local alerting and notification for plugin issues
 */

import { AlertRule, AlertCondition, Alert, HealthStatus } from './types';
import { MetricsRegistry } from './Metrics';
import { HealthChecker } from './HealthChecker';
import { Logger, CategoryLogger } from './Logger';

declare const Zotero: any;

export interface AlertingConfig {
	checkIntervalMs: number;
	maxAlerts: number;
	defaultCooldownMs: number;
	enableNotifications: boolean;
}

const DEFAULT_CONFIG: AlertingConfig = {
	checkIntervalMs: 60000, // 1 minute
	maxAlerts: 100,
	defaultCooldownMs: 300000, // 5 minutes
	enableNotifications: true,
};

/**
 * Default alert rules for common issues
 */
const DEFAULT_RULES: AlertRule[] = [
	{
		id: 'high-failure-rate',
		name: 'High Archive Failure Rate',
		description: 'Archive success rate dropped below 50%',
		condition: {
			metric: 'successRate',
			operator: '<',
			threshold: 0.5,
			windowMs: 3600000, // 1 hour
		},
		severity: 'error',
		enabled: true,
		cooldownMs: 1800000, // 30 minutes
	},
	{
		id: 'service-unhealthy',
		name: 'Service Unhealthy',
		description: 'An archive service is unhealthy',
		condition: {
			metric: 'serviceHealth',
			operator: '==',
			threshold: 0, // 0 = unhealthy
			windowMs: 300000,
		},
		severity: 'warning',
		enabled: true,
		cooldownMs: 600000, // 10 minutes
	},
	{
		id: 'high-latency',
		name: 'High Archive Latency',
		description: 'Average archive time exceeds 60 seconds',
		condition: {
			metric: 'avgLatency',
			operator: '>',
			threshold: 60000,
			windowMs: 1800000, // 30 minutes
		},
		severity: 'warning',
		enabled: true,
		cooldownMs: 900000, // 15 minutes
	},
	{
		id: 'all-services-down',
		name: 'All Services Unavailable',
		description: 'No archive services are available',
		condition: {
			metric: 'availableServices',
			operator: '==',
			threshold: 0,
			windowMs: 60000,
		},
		severity: 'critical',
		enabled: true,
		cooldownMs: 300000,
	},
	{
		id: 'circuit-breaker-open',
		name: 'Circuit Breaker Tripped',
		description: 'A service circuit breaker has opened',
		condition: {
			metric: 'openCircuits',
			operator: '>',
			threshold: 0,
			windowMs: 60000,
		},
		severity: 'warning',
		enabled: true,
		cooldownMs: 600000,
	},
];

/**
 * Alerting Manager handles alert rules and notifications
 */
export class AlertingManager {
	private static instance: AlertingManager;
	private config: AlertingConfig;
	private logger: CategoryLogger;
	private metrics: MetricsRegistry;
	private healthChecker: HealthChecker;
	private rules: Map<string, AlertRule> = new Map();
	private alerts: Alert[] = [];
	private checkInterval?: ReturnType<typeof setInterval>;

	private constructor(config: Partial<AlertingConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.logger = Logger.getInstance().child('Alerting');
		this.metrics = MetricsRegistry.getInstance();
		this.healthChecker = HealthChecker.getInstance();

		// Load default rules
		for (const rule of DEFAULT_RULES) {
			this.rules.set(rule.id, rule);
		}
	}

	static getInstance(config?: Partial<AlertingConfig>): AlertingManager {
		if (!AlertingManager.instance) {
			AlertingManager.instance = new AlertingManager(config);
		}
		return AlertingManager.instance;
	}

	/**
	 * Start alert checking
	 */
	start(): void {
		if (this.checkInterval) {
			return;
		}

		this.checkInterval = setInterval(() => {
			this.evaluateRules();
		}, this.config.checkIntervalMs);

		this.logger.info('Alerting started');
	}

	/**
	 * Stop alert checking
	 */
	stop(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = undefined;
		}
	}

	/**
	 * Add a custom alert rule
	 */
	addRule(rule: AlertRule): void {
		this.rules.set(rule.id, rule);
		this.logger.info('Alert rule added', { ruleId: rule.id });
	}

	/**
	 * Remove an alert rule
	 */
	removeRule(ruleId: string): boolean {
		const removed = this.rules.delete(ruleId);
		if (removed) {
			this.logger.info('Alert rule removed', { ruleId });
		}
		return removed;
	}

	/**
	 * Enable/disable a rule
	 */
	setRuleEnabled(ruleId: string, enabled: boolean): void {
		const rule = this.rules.get(ruleId);
		if (rule) {
			rule.enabled = enabled;
			this.logger.info('Alert rule updated', { ruleId, enabled });
		}
	}

	/**
	 * Evaluate all alert rules
	 */
	private evaluateRules(): void {
		const now = Date.now();

		for (const [, rule] of this.rules) {
			if (!rule.enabled) continue;

			// Check cooldown
			if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldownMs) {
				continue;
			}

			if (this.evaluateCondition(rule.condition)) {
				this.triggerAlert(rule);
			}
		}

		// Check for resolved alerts
		this.checkResolvedAlerts();
	}

	/**
	 * Evaluate a single condition
	 */
	private evaluateCondition(condition: AlertCondition): boolean {
		const value = this.getMetricValue(condition.metric, condition.serviceId);

		switch (condition.operator) {
			case '>':
				return value > condition.threshold;
			case '<':
				return value < condition.threshold;
			case '>=':
				return value >= condition.threshold;
			case '<=':
				return value <= condition.threshold;
			case '==':
				return value === condition.threshold;
			case '!=':
				return value !== condition.threshold;
			default:
				return false;
		}
	}

	/**
	 * Get metric value for evaluation
	 */
	private getMetricValue(metric: string, serviceId?: string): number {
		const snapshot = this.metrics.getSnapshot();
		const systemHealth = this.healthChecker.getSystemHealth();

		switch (metric) {
			case 'successRate':
				return snapshot.successRate;

			case 'avgLatency':
				return snapshot.avgDuration;

			case 'failureCount':
				return snapshot.archiveFailures;

			case 'activeOperations':
				return snapshot.activeOperations;

			case 'serviceHealth':
				if (serviceId) {
					const health = this.healthChecker.getServiceHealth(serviceId);
					return health?.status === HealthStatus.UNHEALTHY ? 0 : 1;
				}
				return systemHealth.unhealthyCount > 0 ? 0 : 1;

			case 'availableServices':
				return this.healthChecker.getAvailableServices().length;

			case 'openCircuits':
				const breakers = this.healthChecker.getCircuitBreakers();
				const states = breakers.getAllStates();
				let openCount = 0;
				states.forEach(state => {
					if (state.state === 'OPEN') openCount++;
				});
				return openCount;

			default:
				return 0;
		}
	}

	/**
	 * Trigger an alert
	 */
	private triggerAlert(rule: AlertRule): void {
		const now = Date.now();

		const alert: Alert = {
			ruleId: rule.id,
			ruleName: rule.name,
			severity: rule.severity,
			timestamp: now,
			message: rule.description,
			context: {
				condition: rule.condition,
				currentValue: this.getMetricValue(rule.condition.metric, rule.condition.serviceId),
			},
			resolved: false,
		};

		this.alerts.push(alert);
		rule.lastTriggered = now;

		// Trim old alerts
		if (this.alerts.length > this.config.maxAlerts) {
			this.alerts = this.alerts.slice(-this.config.maxAlerts);
		}

		this.logger.warning('Alert triggered', {
			ruleId: rule.id,
			severity: rule.severity,
			message: rule.description,
		});

		// Show notification to user
		if (this.config.enableNotifications) {
			this.showNotification(alert);
		}
	}

	/**
	 * Check for resolved alerts
	 */
	private checkResolvedAlerts(): void {
		const now = Date.now();

		for (const alert of this.alerts) {
			if (alert.resolved) continue;

			const rule = this.rules.get(alert.ruleId);
			if (!rule) continue;

			// Check if condition is no longer met
			if (!this.evaluateCondition(rule.condition)) {
				alert.resolved = true;
				alert.resolvedAt = now;

				this.logger.info('Alert resolved', {
					ruleId: alert.ruleId,
					duration: now - alert.timestamp,
				});
			}
		}
	}

	/**
	 * Show notification to user via Zotero
	 */
	private showNotification(alert: Alert): void {
		try {
			const progressWin = new (Zotero.ProgressWindow as any)({ closeOnClick: true });

			const severityPrefix = {
				info: 'ℹ️',
				warning: '⚠️',
				error: '❌',
				critical: '🚨',
			}[alert.severity];

			progressWin.changeHeadline(`${severityPrefix} Moment-o7 Alert`);
			progressWin.addDescription(alert.message);
			progressWin.show();
			progressWin.startCloseTimer(alert.severity === 'critical' ? 10000 : 5000);
		} catch (error) {
			this.logger.error('Failed to show notification', error as Error);
		}
	}

	/**
	 * Get active (unresolved) alerts
	 */
	getActiveAlerts(): Alert[] {
		return this.alerts.filter(a => !a.resolved);
	}

	/**
	 * Get all alerts
	 */
	getAllAlerts(
		options: {
			since?: number;
			severity?: Alert['severity'];
			resolved?: boolean;
			limit?: number;
		} = {}
	): Alert[] {
		let filtered = this.alerts;

		if (options.since) {
			filtered = filtered.filter(a => a.timestamp >= options.since!);
		}
		if (options.severity) {
			filtered = filtered.filter(a => a.severity === options.severity);
		}
		if (options.resolved !== undefined) {
			filtered = filtered.filter(a => a.resolved === options.resolved);
		}
		if (options.limit) {
			filtered = filtered.slice(-options.limit);
		}

		return filtered;
	}

	/**
	 * Get alert statistics
	 */
	getAlertStats(): {
		total: number;
		active: number;
		resolved: number;
		bySeverity: Record<string, number>;
		avgResolutionTime: number;
	} {
		const resolved = this.alerts.filter(a => a.resolved);
		const active = this.alerts.filter(a => !a.resolved);

		const bySeverity: Record<string, number> = {
			info: 0,
			warning: 0,
			error: 0,
			critical: 0,
		};

		for (const alert of this.alerts) {
			bySeverity[alert.severity]++;
		}

		const totalResolutionTime = resolved
			.filter(a => a.resolvedAt)
			.reduce((sum, a) => sum + (a.resolvedAt! - a.timestamp), 0);

		return {
			total: this.alerts.length,
			active: active.length,
			resolved: resolved.length,
			bySeverity,
			avgResolutionTime: resolved.length > 0 ? totalResolutionTime / resolved.length : 0,
		};
	}

	/**
	 * Acknowledge an alert (mark as resolved manually)
	 */
	acknowledgeAlert(timestamp: number): boolean {
		const alert = this.alerts.find(a => a.timestamp === timestamp);
		if (alert && !alert.resolved) {
			alert.resolved = true;
			alert.resolvedAt = Date.now();
			this.logger.info('Alert acknowledged', { ruleId: alert.ruleId });
			return true;
		}
		return false;
	}

	/**
	 * Clear all alerts
	 */
	clearAlerts(): void {
		this.alerts = [];
		this.logger.info('All alerts cleared');
	}

	/**
	 * Get all rules
	 */
	getRules(): AlertRule[] {
		return Array.from(this.rules.values());
	}
}
