/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by temporarily disabling failing operations
 */

export enum CircuitState {
	CLOSED = 'CLOSED', // Normal operation
	OPEN = 'OPEN', // Failing, reject all calls
	HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerOptions {
	failureThreshold: number; // Number of failures before opening
	successThreshold: number; // Number of successes to close from half-open
	timeout: number; // Time in ms before trying half-open
	volumeThreshold: number; // Minimum calls before evaluating
	errorFilter?: (error: Error) => boolean; // Which errors count as failures
}

export interface CircuitBreakerState {
	state: CircuitState;
	failures: number;
	successes: number;
	lastFailureTime?: number;
	totalCalls: number;
	consecutiveSuccesses: number;
}

/**
 * Circuit Breaker implementation
 * Protects against cascading failures in distributed systems
 */
export class CircuitBreaker {
	private state: CircuitState = CircuitState.CLOSED;
	private failures = 0;
	private successes = 0;
	private consecutiveSuccesses = 0;
	private lastFailureTime?: number;
	private totalCalls = 0;
	private halfOpenCalls = 0;

	private readonly options: Required<CircuitBreakerOptions>;

	constructor(options: Partial<CircuitBreakerOptions> = {}) {
		this.options = {
			failureThreshold: options.failureThreshold ?? 5,
			successThreshold: options.successThreshold ?? 2,
			timeout: options.timeout ?? 60000, // 1 minute
			volumeThreshold: options.volumeThreshold ?? 10,
			errorFilter: options.errorFilter ?? (() => true),
		};
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<R>(operation: () => Promise<R>, fallback?: () => Promise<R>): Promise<R> {
		// Check if circuit should transition from OPEN to HALF_OPEN
		this.checkStateTransition();

		if (this.state === CircuitState.OPEN) {
			if (fallback) {
				return fallback();
			}
			throw new Error('Circuit breaker is OPEN - service unavailable');
		}

		if (this.state === CircuitState.HALF_OPEN) {
			this.halfOpenCalls++;
			if (this.halfOpenCalls > this.options.successThreshold) {
				// Too many half-open calls, wait for results
				if (fallback) {
					return fallback();
				}
				throw new Error('Circuit breaker is testing - service may be unavailable');
			}
		}

		this.totalCalls++;

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error as Error);
			throw error;
		}
	}

	/**
	 * Get current circuit breaker state
	 */
	getState(): CircuitBreakerState {
		return {
			state: this.state,
			failures: this.failures,
			successes: this.successes,
			lastFailureTime: this.lastFailureTime,
			totalCalls: this.totalCalls,
			consecutiveSuccesses: this.consecutiveSuccesses,
		};
	}

	/**
	 * Manually reset the circuit breaker
	 */
	reset(): void {
		this.state = CircuitState.CLOSED;
		this.failures = 0;
		this.successes = 0;
		this.consecutiveSuccesses = 0;
		this.lastFailureTime = undefined;
		this.totalCalls = 0;
		this.halfOpenCalls = 0;
	}

	/**
	 * Force the circuit to open
	 */
	trip(): void {
		this.state = CircuitState.OPEN;
		this.lastFailureTime = Date.now();
		this.consecutiveSuccesses = 0;
	}

	/**
	 * Check if state should transition
	 */
	private checkStateTransition(): void {
		if (this.state === CircuitState.OPEN && this.lastFailureTime) {
			const timeSinceFailure = Date.now() - this.lastFailureTime;
			if (timeSinceFailure >= this.options.timeout) {
				this.state = CircuitState.HALF_OPEN;
				this.halfOpenCalls = 0;
			}
		}
	}

	/**
	 * Handle successful operation
	 */
	private onSuccess(): void {
		this.successes++;
		this.consecutiveSuccesses++;

		if (this.state === CircuitState.HALF_OPEN) {
			if (this.consecutiveSuccesses >= this.options.successThreshold) {
				this.state = CircuitState.CLOSED;
				this.failures = 0;
				this.halfOpenCalls = 0;
			}
		}
	}

	/**
	 * Handle failed operation
	 */
	private onFailure(error: Error): void {
		// Check if this error should count as a failure
		if (!this.options.errorFilter(error)) {
			return;
		}

		this.failures++;
		this.consecutiveSuccesses = 0;
		this.lastFailureTime = Date.now();

		if (this.state === CircuitState.HALF_OPEN) {
			this.state = CircuitState.OPEN;
			this.halfOpenCalls = 0;
		} else if (
			this.state === CircuitState.CLOSED &&
			this.totalCalls >= this.options.volumeThreshold &&
			this.failures >= this.options.failureThreshold
		) {
			this.state = CircuitState.OPEN;
		}
	}
}

/**
 * Circuit breaker manager for multiple services
 */
export class CircuitBreakerManager {
	private breakers = new Map<string, CircuitBreaker>();

	/**
	 * Get or create a circuit breaker for a service
	 */
	getBreaker(serviceId: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
		if (!this.breakers.has(serviceId)) {
			this.breakers.set(serviceId, new CircuitBreaker(options));
		}
		return this.breakers.get(serviceId)!;
	}

	/**
	 * Execute operation with circuit breaker for a service
	 */
	async execute<T>(
		serviceId: string,
		operation: () => Promise<T>,
		options?: {
			fallback?: () => Promise<T>;
			breakerOptions?: Partial<CircuitBreakerOptions>;
		}
	): Promise<T> {
		const breaker = this.getBreaker(serviceId, options?.breakerOptions);
		return breaker.execute(operation, options?.fallback);
	}

	/**
	 * Get all circuit breaker states
	 */
	getAllStates(): Map<string, CircuitBreakerState> {
		const states = new Map<string, CircuitBreakerState>();
		for (const [id, breaker] of this.breakers) {
			states.set(id, breaker.getState());
		}
		return states;
	}

	/**
	 * Reset all circuit breakers
	 */
	resetAll(): void {
		for (const breaker of this.breakers.values()) {
			breaker.reset();
		}
	}

	/**
	 * Get services that are currently available (not OPEN)
	 */
	getAvailableServices(): string[] {
		return Array.from(this.breakers.entries())
			.filter(([_, breaker]) => breaker.getState().state !== CircuitState.OPEN)
			.map(([id]) => id);
	}
}
