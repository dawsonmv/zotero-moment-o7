/**
 * Integration tests for ArchiveCoordinator
 * Tests the coordination between multiple archive services
 */

import { ServiceRegistry } from '../../src/services/ServiceRegistry';
import { ArchiveService, ArchiveResult } from '../../src/services/types';

// Mock services for integration testing
const createMockService = (
	id: string,
	options: {
		available?: boolean;
		shouldSucceed?: boolean;
		delay?: number;
		archiveUrl?: string;
	} = {}
): ArchiveService => {
	const {
		available = true,
		shouldSucceed = true,
		delay = 0,
		archiveUrl = `https://archive.org/${id}/test`,
	} = options;

	return {
		name: `Mock ${id} Service`,
		id,
		isAvailable: jest.fn().mockResolvedValue(available),
		archive: jest.fn().mockImplementation(async (items: any[]): Promise<ArchiveResult[]> => {
			if (delay > 0) {
				await new Promise(resolve => setTimeout(resolve, delay));
			}

			return items.map(item => ({
				item,
				success: shouldSucceed,
				archivedUrl: shouldSucceed ? archiveUrl : undefined,
				error: shouldSucceed ? undefined : 'Archive failed',
				service: id,
			}));
		}),
	};
};

// Create mock Zotero Item
const createMockItem = (id: number) =>
	({
		id,
		key: `KEY${id}`,
		version: 1,
		itemType: 'webpage',
		getField: jest.fn().mockReturnValue(`http://example${id}.com`),
		setField: jest.fn(),
		getTags: jest.fn().mockReturnValue([]),
		addTag: jest.fn(),
		removeTag: jest.fn(),
		getNotes: jest.fn().mockReturnValue([]),
		getNote: jest.fn(),
		setNote: jest.fn(),
		save: jest.fn().mockResolvedValue(undefined),
		saveTx: jest.fn().mockResolvedValue(undefined),
	}) as any;

describe('ArchiveCoordinator Integration', () => {
	let registry: ServiceRegistry;

	beforeEach(() => {
		registry = ServiceRegistry.getInstance();
		registry.clear();
		registry.init();
	});

	afterEach(() => {
		registry.clear();
	});

	describe('service registration and discovery', () => {
		it('should register multiple services', () => {
			const service1 = createMockService('service1');
			const service2 = createMockService('service2');
			const service3 = createMockService('service3');

			registry.register('service1', service1);
			registry.register('service2', service2);
			registry.register('service3', service3);

			expect(registry.getAll()).toHaveLength(3);
		});

		it('should filter available services', async () => {
			const available1 = createMockService('available1', { available: true });
			const unavailable = createMockService('unavailable', { available: false });
			const available2 = createMockService('available2', { available: true });

			registry.register('available1', available1);
			registry.register('unavailable', unavailable);
			registry.register('available2', available2);

			const availableServices = await registry.getAvailable();
			expect(availableServices).toHaveLength(2);
			expect(availableServices.map(s => s.id)).not.toContain('unavailable');
		});

		it('should handle service availability errors gracefully', async () => {
			const errorService = createMockService('error', { available: true });
			(errorService.isAvailable as jest.Mock).mockRejectedValue(new Error('Network error'));

			const normalService = createMockService('normal', { available: true });

			registry.register('error', errorService);
			registry.register('normal', normalService);

			const availableServices = await registry.getAvailable();
			expect(availableServices).toHaveLength(1);
			expect(availableServices[0].id).toBe('normal');
		});
	});

	describe('archive workflow', () => {
		it('should archive using primary service', async () => {
			const primaryService = createMockService('primary', {
				shouldSucceed: true,
				archiveUrl: 'https://archive.org/primary/result',
			});

			registry.register('primary', primaryService);

			const mockItem = createMockItem(1);
			const results = await primaryService.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(results[0].archivedUrl).toBe('https://archive.org/primary/result');
		});

		it('should handle archive failures', async () => {
			const failingService = createMockService('failing', { shouldSucceed: false });

			registry.register('failing', failingService);

			const mockItem = createMockItem(1);
			const results = await failingService.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('Archive failed');
		});

		it('should handle multiple items', async () => {
			const service = createMockService('batch', { shouldSucceed: true });
			registry.register('batch', service);

			const mockItems = [createMockItem(1), createMockItem(2), createMockItem(3)];

			const results = await service.archive(mockItems);

			expect(results).toHaveLength(3);
			results.forEach(result => {
				expect(result.success).toBe(true);
			});
		});
	});

	describe('service fallback behavior', () => {
		it('should provide services in registration order', () => {
			const service1 = createMockService('first');
			const service2 = createMockService('second');
			const service3 = createMockService('third');

			registry.register('first', service1);
			registry.register('second', service2);
			registry.register('third', service3);

			const all = registry.getAll();
			expect(all[0].id).toBe('first');
			expect(all[1].id).toBe('second');
			expect(all[2].id).toBe('third');
		});

		it('should allow service replacement', () => {
			const original = createMockService('service', { archiveUrl: 'https://original.com' });
			const replacement = createMockService('service', { archiveUrl: 'https://replacement.com' });

			registry.register('service', original);
			registry.register('service', replacement);

			const service = registry.get('service');
			expect(service).toBe(replacement);
		});
	});

	describe('concurrent operations', () => {
		it('should handle concurrent availability checks', async () => {
			const services = Array.from({ length: 5 }, (_, i) =>
				createMockService(`service${i}`, { available: true, delay: Math.random() * 100 })
			);

			services.forEach((service, i) => {
				registry.register(`service${i}`, service);
			});

			const availableServices = await registry.getAvailable();
			expect(availableServices).toHaveLength(5);
		});

		it('should handle concurrent archive operations', async () => {
			const service = createMockService('concurrent', {
				shouldSucceed: true,
				delay: 50,
			});
			registry.register('concurrent', service);

			const mockItems = Array.from({ length: 10 }, (_, i) => createMockItem(i));

			// Start multiple archive operations concurrently
			const promises = mockItems.map(item => service.archive([item]));
			const results = await Promise.all(promises);

			expect(results).toHaveLength(10);
			results.forEach(result => {
				expect(result[0].success).toBe(true);
			});
		});
	});
});
