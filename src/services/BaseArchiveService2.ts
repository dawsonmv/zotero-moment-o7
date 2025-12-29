/**
 * Refactored base class for archive services
 * Follows Single Responsibility Principle
 */

import {
	ArchiveService,
	ServiceConfig,
	ArchiveResult,
	SingleArchiveResult,
	ArchiveProgress,
} from './types';
import { HttpClient } from '../utils/HttpClient';
import { ProgressReporter } from '../utils/ProgressReporter';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { AsyncCache } from '../utils/Cache';

/**
 * Base implementation for archive services
 * Focused only on the core archiving logic
 */
export abstract class BaseArchiveService2 implements ArchiveService {
	protected httpClient: HttpClient;
	protected progressReporter: ProgressReporter;
	protected circuitBreaker: CircuitBreaker;
	protected cache: AsyncCache<SingleArchiveResult>;

	constructor(protected config: ServiceConfig) {
		this.httpClient = new HttpClient();
		this.progressReporter = new ProgressReporter();
		this.circuitBreaker = new CircuitBreaker({
			failureThreshold: 3,
			timeout: 30000,
			errorFilter: error => {
				// Don't count client errors as circuit failures
				const status = (error as any).status;
				return !status || status >= 500;
			},
		});
		this.cache = new AsyncCache<SingleArchiveResult>({
			maxSize: 100,
			defaultTTL: 3600000, // 1 hour
		});
	}

	get name(): string {
		return this.config.name;
	}

	get id(): string {
		return this.config.id;
	}

	/**
	 * Check if service is available
	 */
	abstract isAvailable(): Promise<boolean>;

	/**
	 * Archive a single URL - to be implemented by subclasses
	 */
	protected abstract performArchive(
		url: string,
		progress?: ArchiveProgress
	): Promise<SingleArchiveResult>;

	/**
	 * Archive multiple items with circuit breaker and caching
	 */
	async archive(items: Zotero.Item[]): Promise<ArchiveResult[]> {
		const results: ArchiveResult[] = [];

		this.progressReporter.start(`Archiving ${items.length} items with ${this.name}`);

		for (const item of items) {
			try {
				const url = this.extractUrl(item);
				if (!url) {
					results.push({
						item,
						success: false,
						error: 'No valid URL found',
					});
					continue;
				}

				this.progressReporter.update(`Archiving: ${url}`);

				// Use cached result if available
				const result = await this.cache.get(this.getCacheKey(url), async () => {
					// Execute with circuit breaker protection
					return await this.circuitBreaker.execute(
						() =>
							this.performArchive(url, {
								onStatusUpdate: status => this.progressReporter.update(status),
							}),
						// Fallback when circuit is open
						async () => ({
							success: false,
							error: 'Service temporarily unavailable',
						})
					);
				});

				if (result.success && result.url) {
					results.push({
						item,
						success: true,
						archivedUrl: result.url,
						service: this.name,
					});
				} else {
					results.push({
						item,
						success: false,
						error: result.error || 'Archive failed',
					});
				}
			} catch (error) {
				results.push({
					item,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		this.progressReporter.complete();
		return results;
	}

	/**
	 * Check if URL is valid for archiving
	 */
	checkValidUrl(url: string): boolean {
		return /^https?:\/\/.+/.test(url);
	}

	/**
	 * Extract URL from Zotero item
	 * Prefers DOI URLs when available
	 */
	protected extractUrl(item: Zotero.Item): string {
		const doi = item.getField('DOI');
		if (doi) {
			return `https://doi.org/${doi}`;
		}
		return item.getField('url') || '';
	}

	/**
	 * Generate cache key for URL
	 */
	protected getCacheKey(url: string): string {
		return `${this.id}:${url}`;
	}

	/**
	 * Subscribe to progress events
	 */
	onProgress(listener: (event: any) => void): () => void {
		return this.progressReporter.subscribe({
			onProgress: listener,
		});
	}

	/**
	 * Get service statistics
	 */
	getStats() {
		return {
			cache: this.cache.getStats(),
			circuitBreaker: this.circuitBreaker.getState(),
		};
	}

	/**
	 * Clear service cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Reset circuit breaker
	 */
	resetCircuit(): void {
		this.circuitBreaker.reset();
	}
}
