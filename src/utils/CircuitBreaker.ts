/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by temporarily disabling failing operations
 */

export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Failing, reject all calls
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
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
 * Custom error thrown when circuit breaker rejects a request
 * Includes circuit state and optional service identifier for debugging
 */
export class CircuitBreakerError extends Error {
  constructor(
    public readonly state: CircuitState,
    public readonly serviceId?: string,
    message?: string,
  ) {
    super(message || `Circuit breaker is ${state}`);
    this.name = "CircuitBreakerError";
  }
}

/**
 * Event emitted when circuit breaker transitions to a new state
 */
export interface CircuitBreakerEvent {
  serviceId?: string;
  previousState: CircuitState;
  newState: CircuitState;
  timestamp: number;
  reason: string;
}

/**
 * Callback function type for circuit breaker state change events
 */
export type CircuitBreakerListener = (event: CircuitBreakerEvent) => void;

/**
 * Circuit Breaker implementation
 *
 * Protects against cascading failures in distributed systems using a three-state pattern:
 * - **CLOSED**: Normal operation, tracking request failures
 * - **OPEN**: Service appears unhealthy, rejecting all requests immediately
 * - **HALF_OPEN**: Testing if service recovered, allowing limited requests
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 5,      // Open after 5 failures
 *   successThreshold: 2,      // Close after 2 successes during recovery
 *   timeout: 60000,           // Wait 1 minute before testing recovery
 *   volumeThreshold: 10,      // Require 10+ calls before considering opening
 *   errorFilter: (error) => {
 *     // Only count specific error types as failures
 *     return !(error instanceof ClientError);
 *   }
 * });
 *
 * // Subscribe to state changes for monitoring
 * breaker.subscribe((event) => {
 *   console.log(`Circuit breaker transitioned: ${event.previousState} -> ${event.newState}`);
 *   console.log(`Reason: ${event.reason}`);
 * });
 *
 * // Use the breaker to protect operations
 * try {
 *   const result = await breaker.execute(
 *     () => callUnreliableService(),  // The protected operation
 *     () => getDefaultValue()         // Fallback when circuit is open
 *   );
 * } catch (error) {
 *   if (error instanceof CircuitBreakerError) {
 *     console.log(`Service unavailable: ${error.state}`);
 *   }
 * }
 * ```
 *
 * @remarks
 * - The circuit requires a minimum volume threshold to avoid premature opening
 * - Errors can be filtered to distinguish client errors from service failures
 * - State transitions emit events for monitoring and alerting integration
 * - The HALF_OPEN state allows controlled testing of service recovery
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime?: number;
  private totalCalls = 0;
  private halfOpenCalls = 0;
  private halfOpenPending = 0; // Track in-flight HALF_OPEN calls
  private stateChangeLock = false; // Prevent concurrent state transitions
  private listeners = new Set<CircuitBreakerListener>();

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
   * Subscribe to circuit breaker state change events
   * @param listener - Callback function called when state changes
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: CircuitBreakerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a state change event to all listeners
   * @param previousState - The state before the transition
   * @param newState - The state after the transition
   * @param reason - Human-readable reason for the state change
   */
  private emit(
    previousState: CircuitState,
    newState: CircuitState,
    reason: string,
  ): void {
    const event: CircuitBreakerEvent = {
      previousState,
      newState,
      timestamp: Date.now(),
      reason,
    };

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Circuit breaker listener error:", error);
      }
    });
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * If the circuit is OPEN (service unavailable), either executes the fallback
   * function or throws CircuitBreakerError. If HALF_OPEN (testing recovery),
   * allows limited concurrent test requests.
   *
   * @template R - The return type of the operation
   * @param operation - The function to execute with protection
   * @param fallback - Optional fallback function to execute when circuit is OPEN
   * @returns The result of the operation or fallback
   * @throws {CircuitBreakerError} When circuit is OPEN and no fallback provided
   * @throws {Error} Any error thrown by the operation (after being filtered)
   *
   * @example
   * ```typescript
   * try {
   *   const data = await breaker.execute(
   *     () => fetchFromUnreliableAPI(),
   *     () => getCachedData() // Used when circuit is OPEN
   *   );
   * } catch (error) {
   *   if (error instanceof CircuitBreakerError) {
   *     console.error('Service unavailable:', error.state);
   *   } else {
   *     console.error('Operation failed:', error.message);
   *   }
   * }
   * ```
   */
  async execute<R>(
    operation: () => Promise<R>,
    fallback?: () => Promise<R>,
  ): Promise<R> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    this.checkStateTransition();

    if (this.state === CircuitState.OPEN) {
      if (fallback) {
        return fallback();
      }
      throw new CircuitBreakerError(
        CircuitState.OPEN,
        undefined,
        "Circuit breaker is OPEN - service unavailable",
      );
    }

    // Track if this call is a HALF_OPEN test call
    const isHalfOpenTest = this.state === CircuitState.HALF_OPEN;

    if (isHalfOpenTest) {
      // Atomically check and increment pending count
      // Only allow successThreshold concurrent test calls
      if (this.halfOpenPending >= this.options.successThreshold) {
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerError(
          CircuitState.HALF_OPEN,
          undefined,
          "Circuit breaker is testing - service may be unavailable",
        );
      }
      this.halfOpenPending++;
      this.halfOpenCalls++;
    }

    this.totalCalls++;

    try {
      const result = await operation();
      this.onSuccess(isHalfOpenTest);
      return result;
    } catch (error) {
      this.onFailure(error as Error, isHalfOpenTest);
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   *
   * Returns an immutable snapshot of the circuit breaker's internal state,
   * useful for monitoring, logging, and decision-making.
   *
   * @returns Circuit breaker state snapshot
   *
   * @example
   * ```typescript
   * const state = breaker.getState();
   * console.log(`Current state: ${state.state}`);
   * console.log(`Failures: ${state.failures} of ${state.totalCalls} calls`);
   * ```
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
   * Manually reset the circuit breaker to CLOSED state
   *
   * Clears all internal state including failure counts, timers, and event listeners.
   * Use this for testing or when you want to force recovery without waiting for timeout.
   *
   * @example
   * ```typescript
   * // Manually reset circuit after manual intervention
   * breaker.reset();
   * console.log(breaker.getState().state); // CLOSED
   * ```
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = undefined;
    this.totalCalls = 0;
    this.halfOpenCalls = 0;
    this.halfOpenPending = 0;
    this.stateChangeLock = false;
    this.listeners.clear();
  }

  /**
   * Force the circuit breaker to OPEN state immediately
   *
   * Marks the service as unavailable without waiting for failure threshold.
   * Useful for manual intervention or when external systems signal unavailability.
   *
   * @example
   * ```typescript
   * // Manually open circuit if health check fails
   * if (!await isServiceHealthy()) {
   *   breaker.trip();
   * }
   * ```
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
        this.emit(
          CircuitState.OPEN,
          CircuitState.HALF_OPEN,
          `Timeout expired (${timeSinceFailure}ms >= ${this.options.timeout}ms) - testing recovery`,
        );
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
      }
    }
  }

  /**
   * Handle successful operation
   * @param wasHalfOpenTest - Whether this was a HALF_OPEN test call
   */
  private onSuccess(wasHalfOpenTest: boolean = false): void {
    this.successes++;
    this.consecutiveSuccesses++;

    if (wasHalfOpenTest) {
      this.halfOpenPending--;
    }

    // Only transition state if not already changed by another call
    if (this.state === CircuitState.HALF_OPEN && !this.stateChangeLock) {
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.stateChangeLock = true;
        this.emit(
          CircuitState.HALF_OPEN,
          CircuitState.CLOSED,
          `Service recovered - ${this.consecutiveSuccesses} consecutive successes`,
        );
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.halfOpenCalls = 0;
        this.halfOpenPending = 0;
        this.stateChangeLock = false;
      }
    }
  }

  /**
   * Handle failed operation
   * @param wasHalfOpenTest - Whether this was a HALF_OPEN test call
   */
  private onFailure(error: Error, wasHalfOpenTest: boolean = false): void {
    // Check if this error should count as a failure
    if (!this.options.errorFilter(error)) {
      if (wasHalfOpenTest) {
        this.halfOpenPending--;
      }
      return;
    }

    this.failures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (wasHalfOpenTest) {
      this.halfOpenPending--;
    }

    // Transition back to OPEN on any failure during HALF_OPEN
    if (this.state === CircuitState.HALF_OPEN && !this.stateChangeLock) {
      this.stateChangeLock = true;
      this.emit(
        CircuitState.HALF_OPEN,
        CircuitState.OPEN,
        "Service still failing during recovery test",
      );
      this.state = CircuitState.OPEN;
      this.halfOpenCalls = 0;
      this.halfOpenPending = 0;
      this.stateChangeLock = false;
    } else if (
      this.state === CircuitState.CLOSED &&
      this.totalCalls >= this.options.volumeThreshold &&
      this.failures >= this.options.failureThreshold
    ) {
      this.emit(
        CircuitState.CLOSED,
        CircuitState.OPEN,
        `Failure threshold reached (${this.failures}/${this.options.failureThreshold} failures after ${this.totalCalls} calls)`,
      );
      this.state = CircuitState.OPEN;
    }
  }
}

/**
 * Circuit breaker manager for multiple services (singleton)
 *
 * Manages individual circuit breakers for different services, allowing centralized
 * coordination of failure protection across an entire system. Implements singleton
 * pattern to ensure a single global instance with consistent state across the application.
 * Lazy-initializes breakers on first access and provides aggregated monitoring capabilities.
 *
 * @example
 * ```typescript
 * // Get the global singleton instance
 * const manager = CircuitBreakerManager.getInstance();
 *
 * // Individual breaker access with auto-creation
 * const archiveBreaker = manager.getBreaker('archive-service', {
 *   failureThreshold: 5,
 *   timeout: 60000
 * });
 *
 * // Convenient method for execute + fallback
 * try {
 *   const result = await manager.execute(
 *     'archive-service',
 *     () => archiveService.submit(url),
 *     {
 *       fallback: () => useAlternativeService(url),
 *       breakerOptions: { failureThreshold: 5 }
 *     }
 *   );
 * } catch (error) {
 *   console.error('Archive failed:', error);
 * }
 *
 * // Monitor all services
 * const states = manager.getAllStates();
 * states.forEach((state, serviceId) => {
 *   console.log(`${serviceId}: ${state.state} (${state.failures} failures)`);
 * });
 *
 * // Get list of available services for fallback ordering
 * const available = manager.getAvailableServices();
 * for (const serviceId of available) {
 *   try {
 *     return await manager.execute(serviceId, () => tryService(serviceId));
 *   } catch (error) {
 *     // Try next service
 *   }
 * }
 * ```
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get the global singleton instance of CircuitBreakerManager
   *
   * @returns The singleton instance, creating it if necessary
   *
   * @example
   * ```typescript
   * const manager = CircuitBreakerManager.getInstance();
   * const breaker = manager.getBreaker('service-id');
   * ```
   */
  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {}

  /**
   * Get or create a circuit breaker for a service
   *
   * If the service doesn't have a breaker yet, creates one with the provided
   * options. Subsequent calls return the same breaker instance.
   *
   * @param serviceId - Unique identifier for the service
   * @param options - Optional circuit breaker configuration (only used on creation)
   * @returns The circuit breaker for this service
   *
   * @example
   * ```typescript
   * const breaker1 = manager.getBreaker('service-a', { failureThreshold: 5 });
   * const breaker2 = manager.getBreaker('service-a');  // Same instance as breaker1
   * ```
   */
  getBreaker(
    serviceId: string,
    options?: Partial<CircuitBreakerOptions>,
  ): CircuitBreaker {
    if (!this.breakers.has(serviceId)) {
      this.breakers.set(serviceId, new CircuitBreaker(options));
    }
    return this.breakers.get(serviceId)!;
  }

  /**
   * Execute operation with circuit breaker for a service
   *
   * Convenient shorthand that automatically gets/creates the breaker
   * and executes the operation with fallback support.
   *
   * @template T - The return type of the operation
   * @param serviceId - Unique identifier for the service
   * @param operation - The function to execute with protection
   * @param options - Optional fallback and breaker configuration
   * @returns The result of the operation or fallback
   * @throws {CircuitBreakerError} If circuit is OPEN and no fallback provided
   *
   * @example
   * ```typescript
   * const result = await manager.execute(
   *   'api-service',
   *   () => fetchFromAPI(),
   *   {
   *     fallback: () => getDefaultData(),
   *     breakerOptions: { timeout: 30000 }
   *   }
   * );
   * ```
   */
  async execute<T>(
    serviceId: string,
    operation: () => Promise<T>,
    options?: {
      fallback?: () => Promise<T>;
      breakerOptions?: Partial<CircuitBreakerOptions>;
    },
  ): Promise<T> {
    const breaker = this.getBreaker(serviceId, options?.breakerOptions);
    return breaker.execute(operation, options?.fallback);
  }

  /**
   * Get all circuit breaker states
   *
   * Returns a snapshot of the state of all known circuit breakers,
   * useful for monitoring, dashboards, and health checks.
   *
   * @returns Map of service IDs to their circuit breaker states
   *
   * @example
   * ```typescript
   * const states = manager.getAllStates();
   * for (const [serviceId, state] of states) {
   *   if (state.state === CircuitState.OPEN) {
   *     console.warn(`${serviceId} is unavailable`);
   *   }
   * }
   * ```
   */
  getAllStates(): Map<string, CircuitBreakerState> {
    const states = new Map<string, CircuitBreakerState>();
    for (const [id, breaker] of this.breakers) {
      states.set(id, breaker.getState());
    }
    return states;
  }

  /**
   * Reset all circuit breakers to CLOSED state
   *
   * Useful for testing or when manually recovering from a widespread outage.
   * Clears all state for all known services.
   *
   * @example
   * ```typescript
   * // After manual intervention to fix the underlying issue
   * manager.resetAll();
   * ```
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get services that are currently available (not OPEN)
   *
   * Returns the IDs of services whose circuit breakers are either CLOSED or HALF_OPEN.
   * Useful for determining fallback order or filtering services for retries.
   *
   * @returns Array of available service IDs
   *
   * @example
   * ```typescript
   * // Try available services in preferred order
   * const available = manager.getAvailableServices();
   * const preferred = ['service-a', 'service-b', 'service-c'].filter(
   *   id => available.includes(id)
   * );
   *
   * for (const serviceId of preferred) {
   *   try {
   *     return await manager.execute(serviceId, () => tryService(serviceId));
   *   } catch (error) {
   *     // Continue to next service
   *   }
   * }
   * ```
   */
  getAvailableServices(): string[] {
    return Array.from(this.breakers.entries())
      .filter(([_, breaker]) => breaker.getState().state !== CircuitState.OPEN)
      .map(([id]) => id);
  }
}
