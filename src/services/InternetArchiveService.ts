/**
 * Internet Archive service implementation
 */

import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveError, ArchiveErrorType, ArchiveProgress } from './types';
import { PreferencesManager } from '../preferences/PreferencesManager';

export class InternetArchiveService extends BaseArchiveService {
	private timeout!: number;
	private maxRetries!: number;
	private retryDelay!: number;

	constructor() {
		super({
			name: 'Internet Archive',
			id: 'internetarchive',
			homepage: 'https://archive.org',
			capabilities: {
				acceptsUrl: true,
				returnsUrl: true,
				preservesJavaScript: true,
				preservesInteractiveElements: true,
			},
		});

		this.reloadSettings();
	}

	async isAvailable(): Promise<boolean> {
		return true; // Internet Archive is always available
	}

	protected async archiveUrl(
		url: string,
		progress?: ArchiveProgress
	): Promise<SingleArchiveResult> {
		// Reload settings in case they changed
		this.reloadSettings();

		let lastError: Error = new Error('Unknown error');
		let attempt = 0;
		let currentTimeout = this.timeout;

		// Retry logic
		while (attempt < this.maxRetries) {
			if (attempt > 0) {
				progress?.onStatusUpdate(`Retrying (attempt ${attempt + 1}/${this.maxRetries})...`);
				await this.delay(this.retryDelay);
			}

			try {
				progress?.onStatusUpdate(`Submitting ${url} to Internet Archive...`);

				const response = await Zotero.HTTP.request('GET', `https://web.archive.org/save/${url}`, {
					timeout: currentTimeout,
					headers: {
						'User-Agent': 'Mozilla/5.0 (compatible; Zotero)',
					},
				});

				const archivedUrl = this.extractArchivedUrl(response);
				if (archivedUrl) {
					return {
						success: true,
						url: archivedUrl,
						metadata: {
							originalUrl: url,
							archiveDate: new Date().toISOString(),
							service: this.name,
						},
					};
				} else {
					throw new Error('Could not extract archived URL from response');
				}
			} catch (error) {
				lastError = error as Error;
				attempt++;

				// Don't retry for certain errors
				const archiveError = error instanceof ArchiveError ? error : this.mapHttpError(error);
				if (
					archiveError.type === ArchiveErrorType.Blocked ||
					archiveError.type === ArchiveErrorType.NotFound ||
					archiveError.type === ArchiveErrorType.InvalidUrl
				) {
					break;
				}

				// For timeout errors, increase timeout for next attempt
				if (archiveError.type === ArchiveErrorType.Timeout) {
					currentTimeout = Math.min(currentTimeout * 1.5, 300000); // Max 5 minutes
				}
			}
		}

		// All retries failed
		const finalError = lastError instanceof ArchiveError ? lastError : this.mapHttpError(lastError);

		if (finalError.type === ArchiveErrorType.Timeout) {
			return {
				success: false,
				error: `Archive request timed out after ${attempt} attempts - the site may be slow or blocking archiving`,
			};
		}

		return {
			success: false,
			error: finalError.message,
		};
	}

	private extractArchivedUrl(response: any): string | null {
		// Try to get from Link header first
		const linkHeader = response.getResponseHeader('Link');
		if (linkHeader) {
			const matches = linkHeader.match(/<([^>]+)>;\s*rel="memento"/g);
			if (matches && matches.length > 0) {
				const lastMatch = matches[matches.length - 1];
				const urlMatch = lastMatch.match(/<([^>]+)>/);
				if (urlMatch) {
					return urlMatch[1];
				}
			}
		}

		// If not in header, try to extract from response
		if (response.responseText) {
			const match = response.responseText.match(
				/https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/
			);
			if (match) {
				return match[0];
			}
		}

		return null;
	}

	private async delay(ms: number): Promise<void> {
		return new Promise(resolve => Zotero.setTimeout(resolve, ms));
	}

	private reloadSettings(): void {
		this.timeout = PreferencesManager.getTimeout('internetarchive');
		this.maxRetries = Zotero.Prefs.get('extensions.momento7.iaMaxRetries', 3) as number;
		this.retryDelay = Zotero.Prefs.get('extensions.momento7.iaRetryDelay', 5000) as number;
	}
}
