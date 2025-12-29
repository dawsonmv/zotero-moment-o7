import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
import { PreferencesManager } from '../preferences/PreferencesManager';

export class UKWebArchiveService extends BaseArchiveService {
	private static readonly API_BASE = 'https://www.webarchive.org.uk';
	private static readonly NOMINATION_URL = 'https://www.webarchive.org.uk/en/ukwa/nominate';

	constructor() {
		super({
			id: 'ukwebarchive',
			name: 'UK Web Archive',
			homepage: 'https://www.webarchive.org.uk',
			capabilities: {
				acceptsUrl: true,
				returnsUrl: false, // Nomination only, doesn't immediately return archived URL
				preservesJavaScript: true,
				preservesInteractiveElements: true,
				regionRestricted: true, // Primarily for UK domains
			},
		});
	}

	async isAvailable(): Promise<boolean> {
		return true;
	}

	protected async archiveUrl(
		url: string,
		progress?: ArchiveProgress
	): Promise<SingleArchiveResult> {
		try {
			// Check if URL is a UK domain
			if (!this.isUKDomain(url)) {
				return {
					success: false,
					error: 'UK Web Archive primarily accepts UK domains (.uk, .co.uk, .org.uk, etc.)',
				};
			}

			progress?.onStatusUpdate(`Nominating ${url} to UK Web Archive...`);

			const timeout = PreferencesManager.getTimeout('ukwebarchive');

			// Submit nomination
			const response = await this.makeHttpRequest(UKWebArchiveService.NOMINATION_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: this.buildNominationForm(url),
				timeout,
			});

			if (!response.success) {
				return {
					success: false,
					error: response.error || 'Failed to submit nomination',
				};
			}

			// Check if nomination was successful
			if (
				response.data.includes('Thank you for your nomination') ||
				response.data.includes('successfully nominated')
			) {
				// Try to find existing archive
				const existingArchive = await this.findExistingArchive(url);

				return {
					success: true,
					url: existingArchive || UKWebArchiveService.NOMINATION_URL,
					metadata: {
						originalUrl: url,
						archiveDate: new Date().toISOString(),
						service: this.config.name,
						status: existingArchive ? 'archived' : 'nominated',
						note: existingArchive
							? 'Found existing archive'
							: 'URL nominated for archiving. Archive will be created during next crawl.',
					},
				};
			}

			return {
				success: false,
				error: 'Nomination may have failed. Please check manually.',
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred',
			} as SingleArchiveResult;
		}
	}

	private isUKDomain(url: string): boolean {
		try {
			const urlObj = new URL(url);
			const domain = urlObj.hostname.toLowerCase();

			// UK domain patterns
			const ukPatterns = [
				/\.uk$/,
				/\.co\.uk$/,
				/\.org\.uk$/,
				/\.ac\.uk$/,
				/\.gov\.uk$/,
				/\.nhs\.uk$/,
				/\.police\.uk$/,
				/\.mod\.uk$/,
				/\.sch\.uk$/,
				/\.me\.uk$/,
				/\.ltd\.uk$/,
				/\.plc\.uk$/,
				/\.net\.uk$/,
			];

			return ukPatterns.some(pattern => pattern.test(domain));
		} catch {
			return false;
		}
	}

	private buildNominationForm(url: string): string {
		const params = new URLSearchParams();
		params.append('url', url);
		params.append('nomination_reason', 'Academic research resource');
		params.append('your_email', ''); // Optional
		params.append('your_name', 'Zotero User'); // Optional
		return params.toString();
	}

	private async findExistingArchive(url: string): Promise<string | null> {
		try {
			// Search for existing archives
			const searchUrl = `${UKWebArchiveService.API_BASE}/en/ukwa/search?q=${encodeURIComponent(url)}`;

			const response = await this.makeHttpRequest(searchUrl, {
				method: 'GET',
				timeout: 30000,
			});

			if (response.success) {
				// Parse search results for archived version
				const archivePattern = new RegExp(
					`https://www\\.webarchive\\.org\\.uk/[^/]+/\\d{14}/[^"'\\s]+`,
					'i'
				);

				const match = response.data.match(archivePattern);
				if (match) {
					return match[0];
				}
			}
		} catch (error) {
			console.warn('Failed to search for existing UK Web Archive:', error);
		}

		return null;
	}

	async checkAvailability(url: string): Promise<{ available: boolean; existingUrl?: string }> {
		try {
			// First check if it's a UK domain
			if (!this.isUKDomain(url)) {
				return { available: false };
			}

			// Try to find existing archive
			const existingArchive = await this.findExistingArchive(url);

			if (existingArchive) {
				return { available: true, existingUrl: existingArchive };
			}

			// Service is available for nomination
			return { available: true };
		} catch (error) {
			return { available: false };
		}
	}
}
