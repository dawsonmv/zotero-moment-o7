/**
 * Tests for PermaCCService
 */

import { PermaCCService } from '../../src/services/PermaCCService';

// Mock PreferencesManager
jest.mock('../../src/preferences/PreferencesManager', () => ({
	PreferencesManager: {
		getTimeout: jest.fn().mockReturnValue(60000),
		getInstance: jest.fn().mockReturnValue({
			getPref: jest.fn(),
		}),
	},
}));

describe('PermaCCService', () => {
	let service: PermaCCService;
	let mockItem: Zotero.Item;

	beforeEach(() => {
		jest.clearAllMocks();

		// Default: no API key configured
		(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'extensions.momento7.permaccApiKey') return null;
			if (key === 'extensions.momento7.permaccFolder') return null;
			return undefined;
		});

		service = new PermaCCService();

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
			getTags: jest.fn().mockReturnValue([]),
			addTag: jest.fn(),
			saveTx: jest.fn().mockResolvedValue(undefined),
		} as unknown as Zotero.Item;
	});

	describe('constructor', () => {
		it('should have correct name', () => {
			expect(service.name).toBe('Perma.cc');
		});

		it('should have correct id', () => {
			expect(service.id).toBe('permacc');
		});

		it('should require authentication', () => {
			expect((service as any).config.capabilities.requiresAuthentication).toBe(true);
		});

		it('should have quota', () => {
			expect((service as any).config.capabilities.hasQuota).toBe(true);
		});
	});

	describe('isAvailable', () => {
		it('should return false when no API key', async () => {
			const result = await service.isAvailable();
			expect(result).toBe(false);
		});

		it('should return true when API key is configured', async () => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				return null;
			});

			// Recreate service to load credentials
			const serviceWithKey = new PermaCCService();

			const result = await serviceWithKey.isAvailable();
			expect(result).toBe(true);
		});
	});

	describe('archive without API key', () => {
		it('should fail with helpful error message', async () => {
			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('API key not configured');
		});
	});

	describe('archive with API key', () => {
		beforeEach(() => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				if (key === 'extensions.momento7.permaccFolder') return null;
				return undefined;
			});

			service = new PermaCCService();
		});

		it('should create archive successfully', async () => {
			const response = {
				guid: 'ABC-123',
				url: 'https://example.com/article',
				title: 'Example Article',
				creation_timestamp: '2023-12-15T12:00:00Z',
			};

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify(response),
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(results[0].archivedUrl).toBe('https://perma.cc/ABC-123');
		});

		it('should include Authorization header', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ guid: 'XYZ-789' }),
			});

			await service.archive([mockItem]);

			expect(Zotero.HTTP.request).toHaveBeenCalledWith(
				'POST',
				expect.stringContaining('api.perma.cc'),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: 'ApiKey test-api-key',
					}),
				})
			);
		});

		it('should include folder when configured', async () => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				if (key === 'extensions.momento7.permaccFolder') return 'my-folder-id';
				return undefined;
			});

			const serviceWithFolder = new PermaCCService();

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ guid: 'XYZ-789' }),
			});

			await serviceWithFolder.archive([mockItem]);

			const callArgs = (Zotero.HTTP.request as jest.Mock).mock.calls[0][2];
			const body = JSON.parse(callArgs.body);
			expect(body.folder).toBe('my-folder-id');
		});

		it('should handle missing GUID in response', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ url: 'https://example.com' }),
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('No GUID returned');
		});

		it('should handle quota exceeded error', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 429,
				responseText: JSON.stringify({
					error: 'quota_exceeded',
					detail: 'You have exceeded your monthly quota',
				}),
				message: 'Too Many Requests',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toBeDefined();
		});

		it('should handle invalid API key error', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 401,
				responseText: JSON.stringify({
					detail: 'Invalid API key',
				}),
				message: 'Unauthorized',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toBeDefined();
		});

		it('should handle network errors', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error('Network failure'));

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('Network failure');
		});
	});

	describe('checkAvailability', () => {
		it('should return unavailable without API key', async () => {
			const result = await service.checkAvailability('https://example.com');

			expect(result.available).toBe(false);
		});

		it('should check user endpoint when API key configured', async () => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				return null;
			});

			const serviceWithKey = new PermaCCService();

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ id: 123, email: 'user@example.com' }),
			});

			const result = await serviceWithKey.checkAvailability('https://example.com');

			expect(result.available).toBe(true);
			expect(Zotero.HTTP.request).toHaveBeenCalledWith(
				'GET',
				expect.stringContaining('/user/'),
				expect.any(Object)
			);
		});

		it('should return unavailable on API error', async () => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				return null;
			});

			const serviceWithKey = new PermaCCService();

			(Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error('API error'));

			const result = await serviceWithKey.checkAvailability('https://example.com');

			expect(result.available).toBe(false);
		});
	});

	describe('getFolders', () => {
		it('should return empty array without API key', async () => {
			const folders = await service.getFolders();

			expect(folders).toEqual([]);
		});

		it('should fetch folders with API key', async () => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				return null;
			});

			const serviceWithKey = new PermaCCService();

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({
					objects: [
						{ id: '1', name: 'Research' },
						{ id: '2', name: 'Personal' },
					],
				}),
			});

			const folders = await serviceWithKey.getFolders();

			expect(folders).toHaveLength(2);
			expect(folders[0].name).toBe('Research');
		});

		it('should handle folder fetch errors', async () => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				return null;
			});

			const serviceWithKey = new PermaCCService();

			(Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error('Failed'));

			const folders = await serviceWithKey.getFolders();

			expect(folders).toEqual([]);
		});
	});

	describe('validateApiKey', () => {
		it('should return true for valid API key', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ id: 123 }),
			});

			const isValid = await service.validateApiKey('valid-key');

			expect(isValid).toBe(true);
		});

		it('should return false for invalid API key', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 401,
				responseText: JSON.stringify({ error: 'Invalid' }),
			});

			const isValid = await service.validateApiKey('invalid-key');

			expect(isValid).toBe(false);
		});

		it('should return false on network error', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error('Network error'));

			const isValid = await service.validateApiKey('any-key');

			expect(isValid).toBe(false);
		});
	});

	describe('error parsing', () => {
		beforeEach(() => {
			(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'extensions.momento7.permaccApiKey') return 'test-api-key';
				return null;
			});

			service = new PermaCCService();
		});

		it('should handle API errors gracefully', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue({
				status: 403,
				responseText: JSON.stringify({
					detail: 'You have reached your quota limit',
				}),
				message: 'Forbidden',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toBeDefined();
		});

		it('should handle malformed error response', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 500,
				responseText: 'Not valid JSON',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			// Should not crash, should have some error
			expect(results[0].error).toBeDefined();
		});
	});
});
