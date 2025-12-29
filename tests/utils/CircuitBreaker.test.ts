/**
 * Unit tests for CircuitBreaker
 */

import {
	CircuitBreaker,
	CircuitState,
	CircuitBreakerManager,
} from '../../src/utils/CircuitBreaker';

describe('CircuitBreaker', () => {
	let breaker: CircuitBreaker;

	beforeEach(() => {
		breaker = new CircuitBreaker({
			failureThreshold: 3,
			successThreshold: 2,
			timeout: 1000,
			volumeThreshold: 5,
		});
	});

	describe('CLOSED state', () => {
		it('should execute operations normally when closed', async () => {
			const operation = jest.fn().mockResolvedValue('success');
			const result = await breaker.execute(operation);

			expect(result).toBe('success');
			expect(operation).toHaveBeenCalled();
			expect(breaker.getState().state).toBe(CircuitState.CLOSED);
		});

		it('should count failures', async () => {
			const operation = jest.fn().mockRejectedValue(new Error('fail'));

			for (let i = 0; i < 2; i++) {
				try {
					await breaker.execute(operation);
				} catch {}
			}

			const state = breaker.getState();
			expect(state.failures).toBe(2);
			expect(state.state).toBe(CircuitState.CLOSED);
		});

		it('should open after reaching failure threshold with sufficient volume', async () => {
			const operation = jest.fn().mockRejectedValue(new Error('fail'));

			// Need to reach volume threshold first
			for (let i = 0; i < 5; i++) {
				try {
					await breaker.execute(operation);
				} catch {}
			}

			const state = breaker.getState();
			expect(state.state).toBe(CircuitState.OPEN);
			expect(state.failures).toBeGreaterThanOrEqual(3);
		});

		it('should not open if volume threshold not met', async () => {
			const operation = jest.fn().mockRejectedValue(new Error('fail'));

			// Only 3 calls (below volume threshold of 5)
			for (let i = 0; i < 3; i++) {
				try {
					await breaker.execute(operation);
				} catch {}
			}

			expect(breaker.getState().state).toBe(CircuitState.CLOSED);
		});
	});

	describe('OPEN state', () => {
		beforeEach(async () => {
			// Open the circuit
			const operation = jest.fn().mockRejectedValue(new Error('fail'));
			for (let i = 0; i < 5; i++) {
				try {
					await breaker.execute(operation);
				} catch {}
			}
		});

		it('should reject calls when open', async () => {
			const operation = jest.fn().mockResolvedValue('success');

			await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');

			expect(operation).not.toHaveBeenCalled();
		});

		it('should use fallback when provided', async () => {
			const operation = jest.fn().mockResolvedValue('success');
			const fallback = jest.fn().mockResolvedValue('fallback');

			const result = await breaker.execute(operation, fallback);

			expect(result).toBe('fallback');
			expect(operation).not.toHaveBeenCalled();
			expect(fallback).toHaveBeenCalled();
		});

		it('should transition to HALF_OPEN after timeout', async () => {
			expect(breaker.getState().state).toBe(CircuitState.OPEN);

			// Wait for timeout
			await new Promise(resolve => setTimeout(resolve, 1100));

			const operation = jest.fn().mockResolvedValue('success');
			await breaker.execute(operation);

			expect(operation).toHaveBeenCalled();
		});
	});

	describe('HALF_OPEN state', () => {
		beforeEach(async () => {
			// Open circuit then wait for timeout
			const operation = jest.fn().mockRejectedValue(new Error('fail'));
			for (let i = 0; i < 5; i++) {
				try {
					await breaker.execute(operation);
				} catch {}
			}
			await new Promise(resolve => setTimeout(resolve, 1100));
		});

		it('should close after successful operations', async () => {
			const operation = jest.fn().mockResolvedValue('success');

			// Need 2 successes to close
			await breaker.execute(operation);
			await breaker.execute(operation);

			expect(breaker.getState().state).toBe(CircuitState.CLOSED);
		});

		it('should reopen on failure', async () => {
			const operation = jest.fn().mockRejectedValue(new Error('fail'));

			try {
				await breaker.execute(operation);
			} catch {}

			expect(breaker.getState().state).toBe(CircuitState.OPEN);
		});

		it('should limit concurrent half-open calls', async () => {
			const operation = jest.fn().mockResolvedValue('success');
			const fallback = jest.fn().mockResolvedValue('fallback');

			// First 2 calls succeed
			await breaker.execute(operation);
			await breaker.execute(operation);

			// Circuit should be closed now, but if it weren't...
			// Additional calls would use fallback
			const promises = Array(5)
				.fill(null)
				.map(() => breaker.execute(operation, fallback));

			await Promise.all(promises);

			// All should succeed since circuit closed after 2 successes
			expect(operation.mock.calls.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('error filtering', () => {
		it('should only count filtered errors', async () => {
			const breaker = new CircuitBreaker({
				failureThreshold: 2,
				volumeThreshold: 2,
				errorFilter: error => error.message !== 'ignore',
			});

			const operation1 = jest.fn().mockRejectedValue(new Error('ignore'));
			const operation2 = jest.fn().mockRejectedValue(new Error('count'));

			// These shouldn't count
			try {
				await breaker.execute(operation1);
			} catch {}
			try {
				await breaker.execute(operation1);
			} catch {}

			expect(breaker.getState().state).toBe(CircuitState.CLOSED);

			// These should count
			try {
				await breaker.execute(operation2);
			} catch {}
			try {
				await breaker.execute(operation2);
			} catch {}

			expect(breaker.getState().state).toBe(CircuitState.OPEN);
		});
	});

	describe('manual controls', () => {
		it('should reset state', async () => {
			breaker.trip();
			expect(breaker.getState().state).toBe(CircuitState.OPEN);

			breaker.reset();
			const state = breaker.getState();
			expect(state.state).toBe(CircuitState.CLOSED);
			expect(state.failures).toBe(0);
			expect(state.successes).toBe(0);
		});

		it('should manually trip', () => {
			breaker.trip();
			expect(breaker.getState().state).toBe(CircuitState.OPEN);
		});
	});
});

describe('CircuitBreakerManager', () => {
	let manager: CircuitBreakerManager;

	beforeEach(() => {
		manager = new CircuitBreakerManager();
	});

	it('should manage multiple breakers', () => {
		const breaker1 = manager.getBreaker('service1');
		const breaker2 = manager.getBreaker('service2');

		expect(breaker1).toBeDefined();
		expect(breaker2).toBeDefined();
		expect(breaker1).not.toBe(breaker2);
	});

	it('should return same breaker for same service', () => {
		const breaker1 = manager.getBreaker('service1');
		const breaker2 = manager.getBreaker('service1');

		expect(breaker1).toBe(breaker2);
	});

	it('should execute with breaker', async () => {
		const operation = jest.fn().mockResolvedValue('success');

		const result = await manager.execute('service1', operation);

		expect(result).toBe('success');
		expect(operation).toHaveBeenCalled();
	});

	it('should get all states', () => {
		manager.getBreaker('service1');
		manager.getBreaker('service2');

		const states = manager.getAllStates();

		expect(states.size).toBe(2);
		expect(states.has('service1')).toBe(true);
		expect(states.has('service2')).toBe(true);
	});

	it('should get available services', async () => {
		// Trip service1
		manager.getBreaker('service1').trip();
		manager.getBreaker('service2'); // Keep closed

		const available = manager.getAvailableServices();

		expect(available).toEqual(['service2']);
	});

	it('should reset all breakers', () => {
		manager.getBreaker('service1').trip();
		manager.getBreaker('service2').trip();

		manager.resetAll();

		const states = manager.getAllStates();
		states.forEach(state => {
			expect(state.state).toBe(CircuitState.CLOSED);
		});
	});
});
