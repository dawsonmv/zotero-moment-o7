/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by temporarily disabling failing operations
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",// Normal operation
    OPEN = "OPEN",// Failing, reject all calls
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    volumeThreshold: number;
    errorFilter?: (error: Error) => boolean;
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
export declare class CircuitBreaker {
    private state;
    private failures;
    private successes;
    private consecutiveSuccesses;
    private lastFailureTime?;
    private totalCalls;
    private halfOpenCalls;
    private readonly options;
    constructor(options?: Partial<CircuitBreakerOptions>);
    /**
     * Execute a function with circuit breaker protection
     */
    execute<R>(operation: () => Promise<R>, fallback?: () => Promise<R>): Promise<R>;
    /**
     * Get current circuit breaker state
     */
    getState(): CircuitBreakerState;
    /**
     * Manually reset the circuit breaker
     */
    reset(): void;
    /**
     * Force the circuit to open
     */
    trip(): void;
    /**
     * Check if state should transition
     */
    private checkStateTransition;
    /**
     * Handle successful operation
     */
    private onSuccess;
    /**
     * Handle failed operation
     */
    private onFailure;
}
/**
 * Circuit breaker manager for multiple services
 */
export declare class CircuitBreakerManager {
    private breakers;
    /**
     * Get or create a circuit breaker for a service
     */
    getBreaker(serviceId: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker;
    /**
     * Execute operation with circuit breaker for a service
     */
    execute<T>(serviceId: string, operation: () => Promise<T>, options?: {
        fallback?: () => Promise<T>;
        breakerOptions?: Partial<CircuitBreakerOptions>;
    }): Promise<T>;
    /**
     * Get all circuit breaker states
     */
    getAllStates(): Map<string, CircuitBreakerState>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
    /**
     * Get services that are currently available (not OPEN)
     */
    getAvailableServices(): string[];
}
//# sourceMappingURL=CircuitBreaker.d.ts.map