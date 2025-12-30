/**
 * Tests for ArchiveTodayService
 */

import { ArchiveTodayService } from '../../src/services/ArchiveTodayService';

// Mock PreferencesManager
jest.mock('../../src/preferences/PreferencesManager', () => ({
	PreferencesManager: {
		getTimeout: jest.fn().mockReturnValue(60000),
		getInstance: jest.fn().mockReturnValue({
			getPref: jest.fn(),
		}),
	},
}));

describe('ArchiveTodayService', () => {
	let service: ArchiveTodayService;
	let mockItem: Zotero.Item;

	beforeEach(() => {
		service = new ArchiveTodayService();
		jest.clearAllMocks();

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
			expect(service.name).toBe('Archive.today');
		});

		it('should have correct id', () => {
			expect(service.id).toBe('archivetoday');
		});
	});

	describe('isAvailable', () => {
		it('should return true', async () => {
			const result = await service.isAvailable();
			expect(result).toBe(true);
		});
	});

	describe('archive via worker', () => {
		it('should archive successfully via worker proxy', async () => {
			const archivedUrl = 'https://archive.today/abc123';

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ archivedUrl }),
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(results[0].archivedUrl).toBe(archivedUrl);

			// Should have used the worker URL
			expect(Zotero.HTTP.request).toHaveBeenCalledWith(
				'POST',
				expect.stringContaining('workers.dev'),
				expect.any(Object)
			);
		});

		it('should handle worker errors', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({ error: 'Worker busy' }),
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});

		it('should handle worker returning no URL', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: JSON.stringify({}),
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});
	});

	describe('archive directly (fallback)', () => {
		// Note: Testing fallback behavior is complex due to the service's internal state
		// (workerAvailable flag). These tests focus on error scenarios.

		it('should handle complete failure gracefully', async () => {
			// Both worker and direct fail
			(Zotero.HTTP.request as jest.Mock)
				.mockRejectedValueOnce(new Error('Worker down'))
				.mockRejectedValueOnce(new Error('Direct also down'));

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
		});
	});

	describe('checkAvailability', () => {
		// checkAvailability uses makeHttpRequest which wraps Zotero.HTTP.request
		// but the wrapper returns a different format

		it('should return available for successful check', async () => {
			// When the check request works, available should be true
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'Some page content',
			});

			const result = await service.checkAvailability('https://example.com');

			// Service should be available even if URL not found
			expect(result.available).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should handle invalid URL', async () => {
			(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
				if (field === 'url') return 'not-a-valid-url';
				return '';
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('No valid URL found');
		});

		it('should handle missing URL', async () => {
			(mockItem.getField as jest.Mock).mockReturnValue('');

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
		});
	});
});
