/**
 * Handles Zotero item operations
 * Separates Zotero-specific concerns from archiving logic
 */

import { HtmlUtils } from '../utils/HtmlUtils';

export interface ItemMetadata {
	url: string;
	title: string;
	doi?: string;
	tags: string[];
	hasArchiveTag: boolean;
}

/**
 * Handles all Zotero item operations
 * Single responsibility: Zotero item manipulation
 */
export class ZoteroItemHandler {
	private static readonly ARCHIVE_TAG = 'archived';

	/**
	 * Extract metadata from Zotero item
	 */
	static extractMetadata(item: Zotero.Item): ItemMetadata {
		const url = item.getField('url') || '';
		const doi = item.getField('DOI');
		const title = item.getField('title') || url;
		const tags = item.getTags ? item.getTags().map(t => t.tag) : [];

		return {
			url: doi ? `https://doi.org/${doi}` : url,
			title,
			doi,
			tags,
			hasArchiveTag: tags.includes(this.ARCHIVE_TAG),
		};
	}

	/**
	 * Save archive information to item
	 */
	static async saveArchiveToItem(
		item: Zotero.Item,
		archiveUrl: string,
		serviceName: string,
		metadata?: Record<string, any>
	): Promise<void> {
		// Add to Extra field
		await this.updateExtraField(item, archiveUrl, serviceName);

		// Add archive tag
		if (!this.hasTag(item, this.ARCHIVE_TAG)) {
			item.addTag(this.ARCHIVE_TAG);
		}

		// Create robust link note
		await this.createArchiveNote(item, archiveUrl, serviceName, metadata);

		// Save changes
		await item.saveTx();
	}

	/**
	 * Update Extra field with archive information
	 */
	private static async updateExtraField(
		item: Zotero.Item,
		archiveUrl: string,
		serviceName: string
	): Promise<void> {
		const extra = item.getField('extra') || '';
		const archiveField = `${serviceName}: ${archiveUrl}`;

		if (!extra.includes(archiveField)) {
			const newExtra = extra ? `${extra}\n${archiveField}` : archiveField;
			item.setField('extra', newExtra);
		}
	}

	/**
	 * Create archive note with robust link
	 */
	private static async createArchiveNote(
		item: Zotero.Item,
		archiveUrl: string,
		serviceName: string,
		metadata?: Record<string, any>
	): Promise<void> {
		const originalUrl = item.getField('url') || '';
		const title = item.getField('title') || originalUrl;
		const archiveDate = new Date().toISOString();

		const robustLink = HtmlUtils.createRobustLink(originalUrl, archiveUrl, title, archiveDate);

		const noteContent = this.generateNoteContent(
			robustLink,
			archiveUrl,
			serviceName,
			archiveDate,
			metadata
		);

		const note = new (Zotero.Item as any)('note');
		note.setNote(noteContent);
		note.parentID = item.id;
		await note.saveTx();
	}

	/**
	 * Generate note content
	 */
	private static generateNoteContent(
		robustLink: string,
		archiveUrl: string,
		serviceName: string,
		archiveDate: string,
		metadata?: Record<string, any>
	): string {
		const sections = [
			`<h3>Archived Version</h3>`,
			`<p>${robustLink}</p>`,
			`<p><strong>Archive URL:</strong> <a href="${HtmlUtils.escape(archiveUrl)}">${HtmlUtils.escape(archiveUrl)}</a></p>`,
			`<p><strong>Archive Service:</strong> ${HtmlUtils.escape(serviceName)}</p>`,
			`<p><strong>Archive Date:</strong> ${new Date(archiveDate).toLocaleDateString()}</p>`,
		];

		if (metadata) {
			sections.push(`<h4>Additional Information</h4>`);
			for (const [key, value] of Object.entries(metadata)) {
				sections.push(
					`<p><strong>${HtmlUtils.escape(key)}:</strong> ${HtmlUtils.escape(String(value))}</p>`
				);
			}
		}

		sections.push(
			`<h4>Robust Link HTML</h4>`,
			`<p>Copy and paste this HTML to cite with archived version:</p>`,
			`<pre>${HtmlUtils.escape(robustLink)}</pre>`
		);

		return sections.join('\n');
	}

	/**
	 * Check if item has a specific tag
	 */
	private static hasTag(item: Zotero.Item, tag: string): boolean {
		const tags = item.getTags ? item.getTags() : [];
		return tags.some(t => t.tag === tag);
	}

	/**
	 * Find existing archive URLs in item
	 */
	static findExistingArchives(item: Zotero.Item): Map<string, string> {
		const archives = new Map<string, string>();

		// Check Extra field
		const extra = item.getField('extra') || '';
		const lines = extra.split('\n');

		for (const line of lines) {
			const match = line.match(/^(.+?):\s*(https?:\/\/.+)$/);
			if (match) {
				archives.set(match[1].toLowerCase(), match[2]);
			}
		}

		// Check notes for robust links
		const notes = this.getItemNotes(item);
		for (const note of notes) {
			const links = this.extractArchiveLinksFromNote(note);
			links.forEach((url, service) => archives.set(service, url));
		}

		return archives;
	}

	/**
	 * Get notes for an item
	 */
	private static getItemNotes(item: Zotero.Item): Zotero.Item[] {
		const noteIds = item.getNotes ? item.getNotes() : [];
		return noteIds.map(id => Zotero.Items.get(id)).filter(note => note !== false) as Zotero.Item[];
	}

	/**
	 * Extract archive links from note content
	 */
	private static extractArchiveLinksFromNote(note: Zotero.Item): Map<string, string> {
		const links = new Map<string, string>();
		if (!note.getNote) return links;

		const content = note.getNote();
		const versionUrlMatch = content.match(/data-versionurl="([^"]+)"/);
		if (versionUrlMatch) {
			const url = versionUrlMatch[1];
			const service = this.detectServiceFromUrl(url);
			if (service) {
				links.set(service, url);
			}
		}

		return links;
	}

	/**
	 * Detect service from URL
	 */
	private static detectServiceFromUrl(url: string): string | null {
		const patterns = [
			{ pattern: /web\.archive\.org/i, service: 'internetarchive' },
			{ pattern: /archive\.(today|is|ph|md|li)/i, service: 'archivetoday' },
			{ pattern: /perma\.cc/i, service: 'permacc' },
			{ pattern: /webarchive\.org\.uk/i, service: 'ukwebarchive' },
			{ pattern: /arquivo\.pt/i, service: 'arquivopt' },
		];

		for (const { pattern, service } of patterns) {
			if (pattern.test(url)) {
				return service;
			}
		}

		return null;
	}

	/**
	 * Check if item needs archiving
	 */
	static needsArchiving(item: Zotero.Item): boolean {
		const metadata = this.extractMetadata(item);

		// Skip if no URL
		if (!metadata.url) return false;

		// Skip if already archived
		if (metadata.hasArchiveTag) return false;

		// Skip certain item types
		const itemType = item.itemType;
		const skipTypes = ['note', 'attachment', 'annotation'];
		if (skipTypes.includes(itemType)) return false;

		return true;
	}
}
