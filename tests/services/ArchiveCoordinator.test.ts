/**
 * Tests for ArchiveCoordinator
 */

import { ArchiveCoordinator } from '../../src/services/ArchiveCoordinator';
import { ServiceRegistry } from '../../src/services/ServiceRegistry';

describe('ArchiveCoordinator', () => {
	let coordinator: ArchiveCoordinator;
	let mockItem: Zotero.Item;
	let mockRegistry: jest.Mocked<ServiceRegistry>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Reset singleton
		(ArchiveCoordinator as any).instance = undefined;

		// Mock ServiceRegistry
		mockRegistry = {
			get: jest.fn(),
			getAll: jest.fn(),
			getAvailable: jest.fn(),
			register: jest.fn(),
			unregister: jest.fn(),
			init: jest.fn(),
		} as unknown as jest.Mocked<ServiceRegistry>;

		jest.spyOn(ServiceRegistry, 'getInstance').mockReturnValue(mockRegistry);

		coordinator = ArchiveCoordinator.getInstance();

		// Create mock item
		mockItem = {
			id: 123,
			getField: jest.fn().mockImplementation((field: string) => {
				if (field === 'url') return 'https://example.com/article';
				if (field === 'title') return 'Example Article';
				return '';
			}),
			setField: jest.fn(),
			saveTx: jest.fn().mockResolvedValue(undefined),
		} as unknown as Zotero.Item;

		// Default preferences mock
		(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
			if (key === 'extensions.momento7.defaultService') return 'internetarchive';
			if (key === 'extensions.momento7.fallbackOrder')
				return 'internetarchive,archivetoday,permacc';
			return defaultValue;
		});
	});

	describe('singleton pattern', () => {
		it('should return the same instance', () => {
			const instance1 = ArchiveCoordinator.getInstance();
			const instance2 = ArchiveCoordinator.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe('archiveItems', () => {
		it('should throw error for empty items array', async () => {
			await expect(coordinator.archiveItems([])).rejects.toThrow('No items provided');
		});

		it('should throw error for null items', async () => {
			await expect(coordinator.archiveItems(null as any)).rejects.toThrow('No items provided');
		});

		it('should archive with specific service', async () => {
			const mockService = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockResolvedValue([
					{
						item: mockItem,
						success: true,
						archivedUrl: 'https://web.archive.org/web/example.com',
					},
				]),
			};

			mockRegistry.get.mockReturnValue(mockService as any);

			const results = await coordinator.archiveItems([mockItem], 'internetarchive');

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(mockService.archive).toHaveBeenCalledWith([mockItem]);
		});

		it('should throw for non-existent service', async () => {
			mockRegistry.get.mockReturnValue(undefined);

			const results = await coordinator.archiveItems([mockItem], 'nonexistent');

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('not found');
		});

		it('should handle item without URL', async () => {
			(mockItem.getField as jest.Mock).mockReturnValue('');

			const results = await coordinator.archiveItems([mockItem], 'internetarchive');

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('no URL');
		});

		it('should handle service archive errors', async () => {
			const mockService = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockRejectedValue(new Error('Network error')),
			};

			mockRegistry.get.mockReturnValue(mockService as any);

			const results = await coordinator.archiveItems([mockItem], 'internetarchive');

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('Network error');
		});

		it('should archive multiple items', async () => {
			const mockItem2 = {
				id: 456,
				getField: jest.fn().mockImplementation((field: string) => {
					if (field === 'url') return 'https://example2.com';
					return '';
				}),
			} as unknown as Zotero.Item;

			const mockService = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockResolvedValue([
					{
						item: mockItem,
						success: true,
						archivedUrl: 'https://web.archive.org/web/1',
					},
				]),
			};

			mockRegistry.get.mockReturnValue(mockService as any);

			const results = await coordinator.archiveItems([mockItem, mockItem2], 'internetarchive');

			expect(results).toHaveLength(2);
			expect(mockService.archive).toHaveBeenCalledTimes(2);
		});
	});

	describe('archiveWithFallback', () => {
		it('should use fallback when no service specified', async () => {
			const mockService1 = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockResolvedValue([{ item: mockItem, success: true }]),
			};

			mockRegistry.getAvailable.mockResolvedValue([
				{ id: 'internetarchive', service: mockService1 },
			] as any);

			const results = await coordinator.archiveItems([mockItem]);

			expect(results[0].success).toBe(true);
		});

		it('should try next service on failure', async () => {
			const mockService1 = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockResolvedValue([{ item: mockItem, success: false, error: 'Failed' }]),
			};

			const mockService2 = {
				name: 'Archive.today',
				id: 'archivetoday',
				archive: jest
					.fn()
					.mockResolvedValue([
						{ item: mockItem, success: true, archivedUrl: 'https://archive.today/abc' },
					]),
			};

			mockRegistry.getAvailable.mockResolvedValue([
				{ id: 'internetarchive', service: mockService1 },
				{ id: 'archivetoday', service: mockService2 },
			] as any);

			const results = await coordinator.archiveItems([mockItem]);

			expect(results[0].success).toBe(true);
			expect(mockService1.archive).toHaveBeenCalled();
			expect(mockService2.archive).toHaveBeenCalled();
		});

		it('should throw when no services available', async () => {
			mockRegistry.getAvailable.mockResolvedValue([]);

			const results = await coordinator.archiveItems([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('No archiving services available');
		});

		it('should collect all errors when all services fail', async () => {
			const mockService1 = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest
					.fn()
					.mockResolvedValue([{ item: mockItem, success: false, error: 'IA error' }]),
			};

			const mockService2 = {
				name: 'Archive.today',
				id: 'archivetoday',
				archive: jest
					.fn()
					.mockResolvedValue([{ item: mockItem, success: false, error: 'AT error' }]),
			};

			mockRegistry.getAvailable.mockResolvedValue([
				{ id: 'internetarchive', service: mockService1 },
				{ id: 'archivetoday', service: mockService2 },
			] as any);

			const results = await coordinator.archiveItems([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('All archive services failed');
		});
	});

	describe('autoArchive', () => {
		it('should auto-archive with default service', async () => {
			const mockService = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest
					.fn()
					.mockResolvedValue([
						{ item: mockItem, success: true, archivedUrl: 'https://web.archive.org/web/x' },
					]),
			};

			mockRegistry.get.mockReturnValue(mockService as any);

			const result = await coordinator.autoArchive(mockItem);

			expect(result).not.toBeNull();
			expect(result?.success).toBe(true);
		});

		it('should return null for item without URL', async () => {
			(mockItem.getField as jest.Mock).mockReturnValue('');

			const result = await coordinator.autoArchive(mockItem);

			expect(result).toBeNull();
		});

		it('should skip local file URLs', async () => {
			(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
				if (field === 'url') return 'file:///Users/test/document.pdf';
				return '';
			});

			const result = await coordinator.autoArchive(mockItem);

			expect(result).toBeNull();
		});

		it('should skip localhost URLs', async () => {
			(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
				if (field === 'url') return 'http://localhost:3000/page';
				return '';
			});

			const result = await coordinator.autoArchive(mockItem);

			expect(result).toBeNull();
		});

		it('should skip private IP addresses', async () => {
			const privateIps = [
				'http://192.168.1.1/page',
				'http://10.0.0.1/page',
				'http://172.16.0.1/page',
				'http://127.0.0.1/page',
			];

			for (const url of privateIps) {
				(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
					if (field === 'url') return url;
					return '';
				});

				const result = await coordinator.autoArchive(mockItem);
				expect(result).toBeNull();
			}
		});

		it('should skip chrome:// and about:// URLs', async () => {
			const specialUrls = ['chrome://settings', 'about:blank', 'data:text/html,<h1>Test</h1>'];

			for (const url of specialUrls) {
				(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
					if (field === 'url') return url;
					return '';
				});

				const result = await coordinator.autoArchive(mockItem);
				expect(result).toBeNull();
			}
		});

		it('should return failed result on archive error', async () => {
			const mockService = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockRejectedValue(new Error('Failed')),
			};

			mockRegistry.get.mockReturnValue(mockService as any);

			const result = await coordinator.autoArchive(mockItem);

			// When service throws, it's caught and returned as failed result
			expect(result).not.toBeNull();
			expect(result?.success).toBe(false);
			expect(result?.error).toContain('Failed');
		});
	});

	describe('service ordering', () => {
		it('should order services according to fallback preferences', async () => {
			const callOrder: string[] = [];

			const mockService1 = {
				name: 'Internet Archive',
				id: 'internetarchive',
				archive: jest.fn().mockImplementation(() => {
					callOrder.push('ia');
					return [{ item: mockItem, success: false, error: 'IA failed' }];
				}),
			};

			const mockService2 = {
				name: 'Perma.cc',
				id: 'permacc',
				archive: jest.fn().mockImplementation(() => {
					callOrder.push('permacc');
					return [{ item: mockItem, success: false, error: 'Perma failed' }];
				}),
			};

			const mockService3 = {
				name: 'Archive.today',
				id: 'archivetoday',
				archive: jest.fn().mockImplementation(() => {
					callOrder.push('at');
					return [{ item: mockItem, success: true }];
				}),
			};

			// Return in different order than fallback
			mockRegistry.getAvailable.mockResolvedValue([
				{ id: 'permacc', service: mockService2 },
				{ id: 'archivetoday', service: mockService3 },
				{ id: 'internetarchive', service: mockService1 },
			] as any);

			await coordinator.archiveItems([mockItem]);

			// Should be called in fallback order: ia, archivetoday, permacc
			expect(callOrder).toEqual(['ia', 'at']);
		});
	});
});
