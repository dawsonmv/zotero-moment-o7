/**
 * Shared utility functions for Zotero Moment-o7
 */

Zotero.MomentO7 = Zotero.MomentO7 || {};

Zotero.MomentO7.Utils = {
	/**
	 * Validate URL for archiving
	 * @param {string} url - URL to validate
	 * @returns {boolean} True if valid for archiving
	 */
	isValidUrl(url) {
		if (!url || typeof url !== "string") {
			return false;
		}
		
		try {
			const parsed = new URL(url);
			
			// Must be HTTP or HTTPS
			if (!["http:", "https:"].includes(parsed.protocol)) {
				return false;
			}
			
			// Must have a valid hostname (not empty)
			if (!parsed.hostname) {
				return false;
			}
			
			// Skip localhost and private IPs
			const hostname = parsed.hostname.toLowerCase();
			if (hostname === "localhost" || 
			    hostname === "127.0.0.1" ||
			    hostname.startsWith("192.168.") ||
			    hostname.startsWith("10.") ||
			    hostname.startsWith("172.")) {
				return false;
			}
			
			// Skip data: and blob: URLs
			if (url.startsWith("data:") || url.startsWith("blob:")) {
				return false;
			}
			
			return true;
		} catch {
			return false;
		}
	},
	
	/**
	 * Get best URL from Zotero item
	 * @param {Zotero.Item} item - Zotero item
	 * @returns {string|null} Best URL for archiving
	 */
	getBestUrl(item) {
		// Primary URL field
		let url = item.getField("url");
		if (this.isValidUrl(url)) {
			return url;
		}
		
		// Check attachments
		const attachments = item.getAttachments();
		for (const attachmentId of attachments) {
			const attachment = Zotero.Items.get(attachmentId);
			if (attachment) {
				url = attachment.getField("url");
				if (this.isValidUrl(url)) {
					return url;
				}
			}
		}
		
		// Check DOI
		const doi = item.getField("DOI");
		if (doi) {
			url = `https://doi.org/${doi}`;
			if (this.isValidUrl(url)) {
				return url;
			}
		}
		
		return null;
	},
	
	/**
	 * Check if item already has archive for service
	 * @param {Zotero.Item} item - Zotero item
	 * @param {string} serviceName - Service name to check
	 * @returns {boolean} True if already archived
	 */
	hasArchive(item, serviceName) {
		const extra = item.getField("extra") || "";
		return extra.includes(`Archive ${serviceName}:`);
	},
	
	/**
	 * Extract archive URLs from item
	 * @param {Zotero.Item} item - Zotero item
	 * @returns {Object} Map of service names to archive URLs
	 */
	getArchiveUrls(item) {
		const archives = {};
		const extra = item.getField("extra") || "";
		const lines = extra.split("\n");
		
		for (const line of lines) {
			const match = line.match(/^Archive ([^:]+):\s*(.+)$/);
			if (match) {
				archives[match[1]] = match[2].trim();
			}
		}
		
		return archives;
	},
	
	/**
	 * Format error message for user
	 * @param {Error|string} error - Error object or message
	 * @returns {string} User-friendly error message
	 */
	formatError(error) {
		if (!error) return "Unknown error";
		
		const message = error.message || error.toString();
		
		// Replace technical errors with user-friendly messages
		const replacements = {
			"ENOTFOUND": "Could not reach the server",
			"ETIMEDOUT": "Connection timed out",
			"ECONNREFUSED": "Connection refused by server",
			"ECONNRESET": "Connection was reset",
			"404": "Page not found",
			"403": "Access forbidden",
			"500": "Server error",
			"502": "Bad gateway", 
			"503": "Service unavailable",
			"NetworkError": "Network connection failed"
		};
		
		for (const [technical, friendly] of Object.entries(replacements)) {
			if (message.includes(technical)) {
				return friendly;
			}
		}
		
		// Remove stack traces and technical details
		return message.split("\n")[0].substring(0, 100);
	},
	
	/**
	 * Create progress window
	 * @param {Window} window - Zotero window
	 * @param {string} headline - Progress headline
	 * @param {boolean} closeOnClick - Whether to close on click
	 * @returns {Zotero.ProgressWindow} Progress window instance
	 */
	createProgress(window, headline, closeOnClick = false) {
		const progressWin = new window.Zotero.ProgressWindow({ closeOnClick });
		progressWin.changeHeadline(headline);
		progressWin.show();
		return progressWin;
	},
	
	/**
	 * Show notification to user
	 * @param {Window} window - Zotero window
	 * @param {string} message - Message to show
	 * @param {string} type - Message type: info, warning, error, success
	 * @param {number} duration - Duration in milliseconds
	 */
	showNotification(window, message, type = "info", duration = 3000) {
		const progressWin = this.createProgress(window, 
			type.charAt(0).toUpperCase() + type.slice(1), true);
		progressWin.addDescription(message);
		
		if (duration > 0) {
			progressWin.startCloseTimer(duration);
		}
		
		return progressWin;
	},
	
	/**
	 * Debounce function calls
	 * @param {Function} func - Function to debounce
	 * @param {number} wait - Wait time in milliseconds
	 * @returns {Function} Debounced function
	 */
	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	},
	
	/**
	 * Retry function with exponential backoff
	 * @param {Function} fn - Async function to retry
	 * @param {number} maxRetries - Maximum retry attempts
	 * @param {number} baseDelay - Base delay in milliseconds
	 * @returns {Promise} Result of function
	 */
	async retry(fn, maxRetries = 3, baseDelay = 1000) {
		let lastError;
		
		for (let i = 0; i < maxRetries; i++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error;
				
				if (i < maxRetries - 1) {
					// Exponential backoff with jitter
					const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}
		
		throw lastError;
	}
};