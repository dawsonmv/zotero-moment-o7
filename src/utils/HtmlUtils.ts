/**
 * HTML utility functions
 * Separates HTML processing concerns from business logic
 */

export class HtmlUtils {
	/**
	 * Escape HTML special characters to prevent XSS
	 */
	static escape(text: string): string {
		if (!text) return '';

		const escapeMap: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
			'/': '&#x2F;',
		};

		return text.replace(/[&<>"'/]/g, char => escapeMap[char]);
	}

	/**
	 * Unescape HTML entities
	 */
	static unescape(text: string): string {
		if (!text) return '';

		const textarea = document.createElement('textarea');
		textarea.innerHTML = text;
		return textarea.value;
	}

	/**
	 * Strip HTML tags from text
	 */
	static stripTags(html: string): string {
		if (!html) return '';

		const div = document.createElement('div');
		div.innerHTML = html;
		return div.textContent || div.innerText || '';
	}

	/**
	 * Create a safe HTML element from text
	 */
	static createSafeElement(tag: string, text: string, attributes?: Record<string, string>): string {
		const escapedText = this.escape(text);
		const attrStr = attributes
			? Object.entries(attributes)
					.map(([key, value]) => `${key}="${this.escape(value)}"`)
					.join(' ')
			: '';

		return `<${tag}${attrStr ? ' ' + attrStr : ''}>${escapedText}</${tag}>`;
	}

	/**
	 * Create a robust link with data attributes
	 */
	static createRobustLink(
		originalUrl: string,
		archivedUrl: string,
		linkText: string,
		versionDate: string = new Date().toISOString()
	): string {
		return this.createSafeElement('a', linkText, {
			href: originalUrl,
			'data-originalurl': originalUrl,
			'data-versionurl': archivedUrl,
			'data-versiondate': versionDate,
		});
	}

	/**
	 * Parse attributes from an HTML string
	 */
	static parseAttributes(html: string): Record<string, string> {
		const div = document.createElement('div');
		div.innerHTML = html;

		const element = div.firstElementChild;
		if (!element) return {};

		const attributes: Record<string, string> = {};
		Array.from(element.attributes).forEach(attr => {
			attributes[attr.name] = attr.value;
		});

		return attributes;
	}

	/**
	 * Extract URLs from HTML content
	 */
	static extractUrls(html: string): string[] {
		const div = document.createElement('div');
		div.innerHTML = html;

		const urls = new Set<string>();

		// Extract from href attributes
		div.querySelectorAll('[href]').forEach(element => {
			const href = element.getAttribute('href');
			if (href && href.startsWith('http')) {
				urls.add(href);
			}
		});

		// Extract from src attributes
		div.querySelectorAll('[src]').forEach(element => {
			const src = element.getAttribute('src');
			if (src && src.startsWith('http')) {
				urls.add(src);
			}
		});

		return Array.from(urls);
	}

	/**
	 * Sanitize HTML to remove potentially dangerous elements
	 */
	static sanitize(html: string, allowedTags: string[] = ['p', 'a', 'span', 'div', 'pre']): string {
		const div = document.createElement('div');
		div.innerHTML = html;

		// Remove script tags and event handlers
		div.querySelectorAll('script, style').forEach(el => el.remove());
		div.querySelectorAll('*').forEach(el => {
			// Remove event handlers
			Array.from(el.attributes).forEach(attr => {
				if (attr.name.startsWith('on')) {
					el.removeAttribute(attr.name);
				}
			});

			// Remove disallowed tags
			if (!allowedTags.includes(el.tagName.toLowerCase())) {
				el.replaceWith(...Array.from(el.childNodes));
			}
		});

		return div.innerHTML;
	}
}
