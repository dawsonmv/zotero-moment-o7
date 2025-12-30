/**
 * Tests for InternetArchiveService
 */

import { InternetArchiveService } from '../../src/services/InternetArchiveService';
import { PreferencesManager } from '../../src/preferences/PreferencesManager';

// Mock PreferencesManager module
jest.mock('../../src/preferences/PreferencesManager', () => {
	const mockInstance = {
		getPref: jest.fn().mockImplementation((key: string) => {
			switch (key) {
				case 'iaTimeout':
					return 120000;
				case 'iaMaxRetries':
					return 3;
				case 'iaRetryDelay':
					return 5000;
				default:
					return undefined;
			}
		}),
		getAll: jest.fn().mockReturnValue({
			iaTimeout: 120000,
			iaMaxRetries: 3,
			iaRetryDelay: 5000,
		}),
	};

	return {
		PreferencesManager: {
			hasIACredentials: jest.fn(),
			getIACredentials: jest.fn(),
			getInstance: jest.fn().mockReturnValue(mockInstance),
			getTimeout: jest.fn().mockReturnValue(120000),
		},
	};
});

describe('InternetArchiveService', () => {
	let service: InternetArchiveService;
	let mockItem: Zotero.Item;

	beforeEach(() => {
		service = new InternetArchiveService();
		jest.clearAllMocks();

		// Default: no credentials
		(PreferencesManager.hasIACredentials as jest.Mock).mockReturnValue(false);

		// Create mock item
		mockItem = {
			id: 123,
			getField: jest.fn().mockImplementation((field: string) => {
				if (field === 'url') return 'https://example.com/article';
				if (field === 'title') return 'Example Article';
				if (field === 'extra') return '';
				return '';
			}),
			setField: jest.fn(),
			saveTx: jest.fn().mockResolvedValue(undefined),
		} as unknown as Zotero.Item;
	});

	describe('constructor', () => {
		it('should have correct name', () => {
			expect(service.name).toBe('Internet Archive');
		});

		it('should have correct id', () => {
			expect(service.id).toBe('internetarchive');
		});
	});

	describe('isAvailable', () => {
		it('should always return true', async () => {
			const result = await service.isAvailable();
			expect(result).toBe(true);
		});
	});

	describe('archive without credentials (public API)', () => {
		beforeEach(() => {
			(PreferencesManager.hasIACredentials as jest.Mock).mockReturnValue(false);
		});

		// Note: Full archive integration tests are in integration tests
		// These tests focus on error handling scenarios

		it('should handle archive.org errors', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 503,
				message: 'Service unavailable',
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});

		it('should handle rate limiting', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 429,
				message: 'Too many requests',
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});

		it('should handle blocked URLs (523)', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 523,
				message: 'Origin is unreachable',
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});
	});

	describe('archive with credentials (SPN2 API)', () => {
		beforeEach(() => {
			(PreferencesManager.hasIACredentials as jest.Mock).mockReturnValue(true);
			(PreferencesManager.getIACredentials as jest.Mock).mockReturnValue({
				accessKey: 'test-access-key',
				secretKey: 'test-secret-key',
			});
		});

		// Note: Full archive integration tests are in integration tests
		// These tests focus on authentication and error handling

		it('should handle authentication errors', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 401,
				message: 'Unauthorized',
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});
	});

	describe('URL handling', () => {
		// Note: DOI preference testing is covered in BaseArchiveService.test.ts

		it('should reject invalid URLs', async () => {
			(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
				if (field === 'url') return 'not-a-valid-url';
				return '';
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('No valid URL found');
		});
	});
});
