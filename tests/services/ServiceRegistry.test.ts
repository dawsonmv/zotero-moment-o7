/**
 * Unit tests for ServiceRegistry
 */

import { ServiceRegistry } from '../../src/services/ServiceRegistry';
import { ArchiveService, ArchiveResult } from '../../src/services/types';

// Mock service for testing
const createMockService = (id: string, available = true): ArchiveService => ({
	name: `Mock ${id} Service`,
	id,
	isAvailable: jest.fn().mockResolvedValue(available),
	archive: jest.fn().mockResolvedValue([{ success: true }] as ArchiveResult[]),
});

describe('ServiceRegistry', () => {
	let registry: ServiceRegistry;

	beforeEach(() => {
		// Reset singleton by clearing it
		registry = ServiceRegistry.getInstance();
		registry.clear();
	});

	describe('singleton pattern', () => {
		it('should return the same instance', () => {
			const instance1 = ServiceRegistry.getInstance();
			const instance2 = ServiceRegistry.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('initialization', () => {
		it('should initialize successfully', () => {
			expect(() => registry.init()).not.toThrow();
		});

		it('should be idempotent', () => {
			registry.init();
			registry.init(); // Should not throw
			expect(registry.getAll()).toHaveLength(0);
		});

		it('should throw when registering before initialization', () => {
			const service = createMockService('test');
			expect(() => registry.register('test', service)).toThrow('Service Registry not initialized');
		});
	});

	describe('register', () => {
		beforeEach(() => {
			registry.init();
		});

		it('should register a service', () => {
			const service = createMockService('test');
			registry.register('test', service);
			expect(registry.get('test')).toBe(service);
		});

		it('should replace existing service with same id', () => {
			const service1 = createMockService('test');
			const service2 = createMockService('test');

			registry.register('test', service1);
			registry.register('test', service2);

			expect(registry.get('test')).toBe(service2);
		});

		it('should register multiple services', () => {
			const service1 = createMockService('service1');
			const service2 = createMockService('service2');

			registry.register('service1', service1);
			registry.register('service2', service2);

			expect(registry.getAll()).toHaveLength(2);
		});
	});

	describe('unregister', () => {
		beforeEach(() => {
			registry.init();
		});

		it('should unregister an existing service', () => {
			const service = createMockService('test');
			registry.register('test', service);

			expect(registry.unregister('test')).toBe(true);
			expect(registry.get('test')).toBeUndefined();
		});

		it('should return false for non-existent service', () => {
			expect(registry.unregister('nonexistent')).toBe(false);
		});
	});

	describe('get', () => {
		beforeEach(() => {
			registry.init();
		});

		it('should return registered service', () => {
			const service = createMockService('test');
			registry.register('test', service);
			expect(registry.get('test')).toBe(service);
		});

		it('should return undefined for non-existent service', () => {
			expect(registry.get('nonexistent')).toBeUndefined();
		});
	});

	describe('getAll', () => {
		beforeEach(() => {
			registry.init();
		});

		it('should return empty array when no services', () => {
			expect(registry.getAll()).toEqual([]);
		});

		it('should return all registered services', () => {
			const service1 = createMockService('service1');
			const service2 = createMockService('service2');

			registry.register('service1', service1);
			registry.register('service2', service2);

			const all = registry.getAll();
			expect(all).toHaveLength(2);
			expect(all.map(e => e.id)).toContain('service1');
			expect(all.map(e => e.id)).toContain('service2');
		});
	});

	describe('getAvailable', () => {
		beforeEach(() => {
			registry.init();
		});

		it('should return only available services', async () => {
			const available = createMockService('available', true);
			const unavailable = createMockService('unavailable', false);

			registry.register('available', available);
			registry.register('unavailable', unavailable);

			const result = await registry.getAvailable();
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe('available');
		});

		it('should handle service availability check errors', async () => {
			const errorService = createMockService('error', true);
			(errorService.isAvailable as jest.Mock).mockRejectedValue(new Error('Check failed'));

			registry.register('error', errorService);

			const result = await registry.getAvailable();
			expect(result).toHaveLength(0);
		});

		it('should return empty array when no services available', async () => {
			const unavailable = createMockService('unavailable', false);
			registry.register('unavailable', unavailable);

			const result = await registry.getAvailable();
			expect(result).toHaveLength(0);
		});
	});

	describe('clear', () => {
		it('should clear all services and reset initialization', () => {
			registry.init();
			const service = createMockService('test');
			registry.register('test', service);

			registry.clear();

			expect(registry.getAll()).toHaveLength(0);
			// After clear, should need to init again
			expect(() => registry.register('test', service)).toThrow();
		});
	});
});
