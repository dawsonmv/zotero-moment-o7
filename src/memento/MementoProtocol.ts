/**
 * RFC 7089 Memento Protocol implementation
 * @see https://tools.ietf.org/html/rfc7089
 */

export interface MementoLink {
	url: string;
	rel: string[];
	datetime?: string;
	type?: string;
	from?: string;
	until?: string;
}

export interface TimeMap {
	original: string;
	timegate?: string;
	timemap?: string;
	mementos: Memento[];
}

export interface Memento {
	url: string;
	datetime: string;
	rel?: string[];
}

export interface TimeGateResponse {
	mementoUrl: string;
	mementoDatetime: string;
	original: string;
	links: MementoLink[];
}

export class MementoProtocol {
	private static readonly LINK_HEADER = 'Link';
	private static readonly MEMENTO_DATETIME_HEADER = 'Memento-Datetime';
	// private static readonly ACCEPT_DATETIME_HEADER = 'Accept-Datetime';

	/**
	 * Parse Link header according to RFC 5988
	 */
	static parseLinkHeader(header: string): MementoLink[] {
		const links: MementoLink[] = [];
		const linkPattern = /<([^>]+)>([^,]*)/g;

		let match;
		while ((match = linkPattern.exec(header)) !== null) {
			const url = match[1];
			const params = match[2];

			const link: MementoLink = {
				url,
				rel: [],
			};

			// Parse parameters
			const paramPattern = /(\w+)="?([^";]+)"?/g;
			let paramMatch;

			while ((paramMatch = paramPattern.exec(params)) !== null) {
				const key = paramMatch[1];
				const value = paramMatch[2];

				switch (key) {
					case 'rel':
						link.rel = value.split(/\s+/);
						break;
					case 'datetime':
						link.datetime = value;
						break;
					case 'type':
						link.type = value;
						break;
					case 'from':
						link.from = value;
						break;
					case 'until':
						link.until = value;
						break;
				}
			}

			if (link.rel.length > 0) {
				links.push(link);
			}
		}

		return links;
	}

	/**
	 * Format Link header
	 */
	static formatLinkHeader(links: MementoLink[]): string {
		return links
			.map(link => {
				let header = `<${link.url}>`;
				const params: string[] = [];

				if (link.rel.length > 0) {
					params.push(`rel="${link.rel.join(' ')}"`);
				}

				if (link.datetime) {
					params.push(`datetime="${link.datetime}"`);
				}

				if (link.type) {
					params.push(`type="${link.type}"`);
				}

				if (link.from) {
					params.push(`from="${link.from}"`);
				}

				if (link.until) {
					params.push(`until="${link.until}"`);
				}

				if (params.length > 0) {
					header += '; ' + params.join('; ');
				}

				return header;
			})
			.join(', ');
	}

	/**
	 * Parse TimeMap from JSON
	 */
	static parseTimeMap(json: any): TimeMap {
		const timemap: TimeMap = {
			original: '',
			mementos: [],
		};

		if (json.original_uri) {
			timemap.original = json.original_uri;
		}

		if (json.timegate_uri) {
			timemap.timegate = json.timegate_uri;
		}

		if (json.timemap_uri) {
			timemap.timemap = json.timemap_uri;
		}

		if (json.mementos && Array.isArray(json.mementos.list)) {
			timemap.mementos = json.mementos.list.map((m: any) => ({
				url: m.uri,
				datetime: m.datetime,
				rel: m.rel ? m.rel.split(/\s+/) : [],
			}));
		}

		return timemap;
	}

	/**
	 * Parse TimeMap from link format
	 */
	static parseTimemapLinkFormat(text: string): TimeMap {
		const timemap: TimeMap = {
			original: '',
			mementos: [],
		};

		const lines = text.split('\n').filter(line => line.trim());

		for (const line of lines) {
			const links = this.parseLinkHeader(line);

			for (const link of links) {
				if (link.rel.includes('original')) {
					timemap.original = link.url;
				} else if (link.rel.includes('timegate')) {
					timemap.timegate = link.url;
				} else if (link.rel.includes('self') && link.type?.includes('timemap')) {
					timemap.timemap = link.url;
				} else if (link.rel.includes('memento') && link.datetime) {
					timemap.mementos.push({
						url: link.url,
						datetime: link.datetime,
						rel: link.rel,
					});
				}
			}
		}

		return timemap;
	}

	/**
	 * Find the best memento for a given datetime
	 */
	static findBestMemento(mementos: Memento[], targetDate?: Date): Memento | null {
		if (mementos.length === 0) {
			return null;
		}

		if (!targetDate) {
			// Return most recent memento
			return mementos.reduce((latest, current) => {
				const latestDate = new Date(latest.datetime);
				const currentDate = new Date(current.datetime);
				return currentDate > latestDate ? current : latest;
			});
		}

		// Find closest memento to target date
		return mementos.reduce((closest, current) => {
			const closestDiff = Math.abs(new Date(closest.datetime).getTime() - targetDate.getTime());
			const currentDiff = Math.abs(new Date(current.datetime).getTime() - targetDate.getTime());
			return currentDiff < closestDiff ? current : closest;
		});
	}

	/**
	 * Format HTTP date
	 */
	static formatHttpDate(date: Date): string {
		return date.toUTCString();
	}

	/**
	 * Parse HTTP date
	 */
	static parseHttpDate(dateStr: string): Date {
		return new Date(dateStr);
	}

	/**
	 * Check if a response is a memento
	 */
	static isMemento(headers: Record<string, string>): boolean {
		const linkHeader = headers[this.LINK_HEADER] || headers['link'];
		if (!linkHeader) {
			return false;
		}

		const links = this.parseLinkHeader(linkHeader);
		return links.some(link => link.rel.includes('memento'));
	}

	/**
	 * Extract memento information from response headers
	 */
	static extractMementoInfo(headers: Record<string, string>): TimeGateResponse | null {
		const linkHeader = headers[this.LINK_HEADER] || headers['link'];
		const mementoDatetime = headers[this.MEMENTO_DATETIME_HEADER] || headers['memento-datetime'];

		if (!linkHeader) {
			return null;
		}

		const links = this.parseLinkHeader(linkHeader);
		const mementoLink = links.find(link => link.rel.includes('memento'));
		const originalLink = links.find(link => link.rel.includes('original'));

		if (!mementoLink || !originalLink) {
			return null;
		}

		return {
			mementoUrl: mementoLink.url,
			mementoDatetime: mementoDatetime || mementoLink.datetime || '',
			original: originalLink.url,
			links,
		};
	}
}
