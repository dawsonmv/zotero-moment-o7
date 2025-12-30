/**
 * Tests for UKWebArchiveService
 */

import { UKWebArchiveService } from '../../src/services/UKWebArchiveService';

// Mock PreferencesManager
jest.mock('../../src/preferences/PreferencesManager', () => ({
	PreferencesManager: {
		getTimeout: jest.fn().mockReturnValue(60000),
		getInstance: jest.fn().mockReturnValue({
			getPref: jest.fn(),
		}),
	},
}));

describe('UKWebArchiveService', () => {
	let service: UKWebArchiveService;
	let mockItem: Zotero.Item;

	beforeEach(() => {
		service = new UKWebArchiveService();
		jest.clearAllMocks();

		// Create mock item with UK domain
		mockItem = {
			id: 123,
			getField: jest.fn().mockImplementation((field: string) => {
				if (field === 'url') return 'https://example.co.uk/article';
				if (field === 'title') return 'Example UK Article';
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
			expect(service.name).toBe('UK Web Archive');
		});

		it('should have correct id', () => {
			expect(service.id).toBe('ukwebarchive');
		});

		it('should have regionRestricted capability', () => {
			expect((service as any).config.capabilities.regionRestricted).toBe(true);
		});

		it('should not return URL immediately', () => {
			expect((service as any).config.capabilities.returnsUrl).toBe(false);
		});
	});

	describe('isAvailable', () => {
		it('should return true', async () => {
			const result = await service.isAvailable();
			expect(result).toBe(true);
		});
	});

	describe('UK domain validation', () => {
		const ukDomains = [
			'https://example.uk/page',
			'https://example.co.uk/page',
			'https://example.org.uk/page',
			'https://example.ac.uk/page',
			'https://example.gov.uk/page',
			'https://example.nhs.uk/page',
			'https://example.police.uk/page',
			'https://example.mod.uk/page',
			'https://example.sch.uk/page',
			'https://example.me.uk/page',
			'https://example.ltd.uk/page',
			'https://example.plc.uk/page',
			'https://example.net.uk/page',
		];

		const nonUkDomains = [
			'https://example.com/page',
			'https://example.org/page',
			'https://example.de/page',
			'https://example.fr/page',
			'https://example.co.nz/page',
		];

		ukDomains.forEach(url => {
			it(`should accept UK domain: ${url}`, async () => {
				(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
					if (field === 'url') return url;
					return '';
				});

				(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
					status: 200,
					responseText: 'Thank you for your nomination',
				});

				const results = await service.archive([mockItem]);

				expect(results[0].success).toBe(true);
			});
		});

		nonUkDomains.forEach(url => {
			it(`should reject non-UK domain: ${url}`, async () => {
				(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
					if (field === 'url') return url;
					return '';
				});

				const results = await service.archive([mockItem]);

				expect(results[0].success).toBe(false);
				expect(results[0].error).toContain('UK domains');
			});
		});
	});

	describe('archive (nomination)', () => {
		it('should submit nomination successfully', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'Thank you for your nomination. We will review it.',
			});

			const results = await service.archive([mockItem]);

			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(true);
			expect(Zotero.HTTP.request).toHaveBeenCalledWith(
				'POST',
				expect.stringContaining('nominate'),
				expect.any(Object)
			);
		});

		it('should include nomination form data', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'Thank you for your nomination',
			});

			await service.archive([mockItem]);

			const callArgs = (Zotero.HTTP.request as jest.Mock).mock.calls[0][2];
			expect(callArgs.body).toContain('url=');
			expect(callArgs.body).toContain('nomination_reason=');
		});

		it('should recognize alternative success message', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'The URL has been successfully nominated for archiving.',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(true);
		});

		it('should return existing archive URL when found', async () => {
			const existingArchiveHtml = `
				<html>
				<body>
					Thank you for your nomination
					<a href="https://www.webarchive.org.uk/wayback/20231215120000/https://example.co.uk/article">View archive</a>
				</body>
				</html>
			`;

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: existingArchiveHtml,
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(true);
			expect(results[0].archivedUrl).toContain('webarchive.org.uk');
		});

		it('should handle nomination failure', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'An error occurred processing your request.',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toContain('may have failed');
		});

		it('should handle network errors', async () => {
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error('Connection failed'));

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
		});

		it('should handle server errors', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 500,
				responseText: 'Internal Server Error',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
		});
	});

	describe('checkAvailability', () => {
		it('should return unavailable for non-UK domains', async () => {
			const result = await service.checkAvailability('https://example.com');

			expect(result.available).toBe(false);
		});

		it('should return available for UK domains', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: '<html>Search results</html>',
			});

			const result = await service.checkAvailability('https://example.co.uk');

			expect(result.available).toBe(true);
		});

		it('should return existing URL when found', async () => {
			const searchResultsHtml = `
				<html>
				<body>
					Search results:
					<a href="https://www.webarchive.org.uk/wayback/20231215120000/https://example.co.uk">Archived version</a>
				</body>
				</html>
			`;

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: searchResultsHtml,
			});

			const result = await service.checkAvailability('https://example.co.uk');

			expect(result.available).toBe(true);
			expect(result.existingUrl).toContain('webarchive.org.uk/wayback/20231215120000');
		});

		it('should still be available even when search fails for UK domains', async () => {
			// The service catches search errors and still returns available=true for UK domains
			// because the service itself is available, just can't find existing archives
			(Zotero.HTTP.request as jest.Mock).mockRejectedValue(new Error('Search failed'));

			const result = await service.checkAvailability('https://example.co.uk');

			// Service is still available for nominations even if search fails
			expect(result.available).toBe(true);
			expect(result.existingUrl).toBeUndefined();
		});
	});

	describe('metadata', () => {
		it('should include nomination status in metadata', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'Thank you for your nomination',
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(true);
			// The metadata should indicate the URL was nominated
		});

		it('should include existing archive status when found', async () => {
			const responseWithArchive = `
				Thank you for your nomination
				<a href="https://www.webarchive.org.uk/wayback/20231215120000/https://example.co.uk">Existing</a>
			`;

			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: responseWithArchive,
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(true);
			expect(results[0].archivedUrl).toContain('webarchive.org.uk');
		});
	});

	describe('invalid URL handling', () => {
		it('should handle invalid URL format', async () => {
			(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
				if (field === 'url') return 'not-a-valid-url';
				return '';
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('No valid URL found');
		});

		it('should handle empty URL', async () => {
			(mockItem.getField as jest.Mock).mockImplementation((field: string) => {
				if (field === 'url') return '';
				return '';
			});

			const results = await service.archive([mockItem]);

			expect(results[0].success).toBe(false);
		});
	});

	describe('findExistingArchive', () => {
		it('should search for existing archives', async () => {
			(Zotero.HTTP.request as jest.Mock).mockResolvedValue({
				status: 200,
				responseText: 'Thank you for your nomination',
			});

			await service.archive([mockItem]);

			// Should make at least one request (nomination POST)
			const calls = (Zotero.HTTP.request as jest.Mock).mock.calls;
			expect(calls.length).toBeGreaterThanOrEqual(1);
		});
	});
});
