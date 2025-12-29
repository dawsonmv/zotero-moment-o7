if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.InternetArchiveService = class extends Zotero.MomentO7.BaseArchiveService {
	constructor() {
		super({
			name: "Internet Archive",
			id: "internetarchive",
			requiresAuth: false,
			supportsMemento: true,
			rateLimit: 2000 // 2 seconds between requests
		});

		// Configurable timeout and retry settings
		this.reloadSettings();
	}

	async isAvailable() {
		return true; // Internet Archive is always available
	}

	async archive(items) {
		const results = [];

		for (const item of items) {
			try {
				const result = await this.archiveItem(item);
				results.push(result);
			} catch (e) {
				results.push({
					item: item,
					success: false,
					error: e.message
				});
			}
		}

		return results;
	}

	async archiveItem(item) {
		// Reload settings in case they changed
		this.reloadSettings();

		const url = this.getBestUrl(item);

		if (!this.checkValidUrl(url)) {
			throw new Error("Invalid URL for archiving");
		}

		if (this.isArchived(item)) {
			return {
				item: item,
				success: true,
				message: "Already archived"
			};
		}

		await this.checkRateLimit();

		const progressWindow = this.showProgressWindow(
			"Archiving to Internet Archive",
			`Archiving: ${item.getField("title") || url}`
		);

		let lastError = null;
		let attempt = 0;

		while (attempt < this.maxRetries) {
			try {
				if (attempt > 0) {
					progressWindow.addDescription(`Retry attempt ${attempt} of ${this.maxRetries - 1}...`);
					await this.delay(this.retryDelay);
				}

				const archiveUrl = `https://web.archive.org/save/${url}`;

				const response = await Zotero.HTTP.request("GET", archiveUrl, {
					headers: {
						"User-Agent": "Zotero Moment-o7",
						Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
					},
					timeout: this.timeout,
					responseType: "text"
				});

				this.updateLastRequest();

				let archivedUrl = null;

				const linkHeader = response.getResponseHeader("Link");
				if (linkHeader) {
					archivedUrl = this.getLastMemento(linkHeader);
				}

				if (!archivedUrl && response.responseText) {
					const match = response.responseText.match(
						/https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/
					);
					if (match) {
						archivedUrl = match[0];
					}
				}

				if (archivedUrl) {
					await this.saveToItem(item, archivedUrl);
					item.addTag("archived");
					await item.saveTx();

					progressWindow.close();
					this.showSuccess(`Archived successfully: ${archivedUrl}`);

					return {
						item: item,
						success: true,
						archivedUrl: archivedUrl
					};
				} else {
					throw new Error("Could not extract archived URL from response");
				}
			} catch (error) {
				lastError = error;
				attempt++;

				// Don't retry for certain errors
				if (error.status === 523 || error.status === 403 || error.status === 404) {
					break;
				}

				// For timeout errors, increase timeout for next attempt
				if (error.message && error.message.includes("timeout")) {
					this.timeout = Math.min(this.timeout * 1.5, 300000); // Max 5 minutes
				}
			}
		}

		// All retries failed
		progressWindow.close();

		let errorMessage = "Archive failed";

		if (lastError.status === 523) {
			errorMessage = "This site cannot be archived (blocked by publisher)";
		} else if (lastError.status === 429) {
			errorMessage = "Archive service is rate limiting. Please wait a few minutes and try again";
		} else if (lastError.status === 403) {
			errorMessage = "Access denied - this site blocks archiving services";
		} else if (lastError.status === 404) {
			errorMessage = "The URL could not be found";
		} else if (lastError.status >= 500) {
			errorMessage = "Archive service is temporarily unavailable";
		} else if (lastError.message && lastError.message.includes("timeout")) {
			errorMessage = `Archive request timed out after ${attempt} attempts - the site may be slow or blocking archiving`;
		} else if (lastError.message) {
			errorMessage = lastError.message;
		}

		throw new Error(errorMessage);
	}

	isArchived(item) {
		const tags = item.getTags();
		return tags.some(tag => tag.tag === "archived");
	}

	checkValidUrl(url) {
		const pattern = /^https?:\/\/.+/;
		return pattern.test(url);
	}

	getBestUrl(item) {
		let url = item.getField("url");
		const doi = item.getField("DOI");

		if (doi && doi !== "") {
			url = "https://doi.org/" + doi;
		}

		return url;
	}

	getLastMemento(linkHeader) {
		if (!linkHeader) {
			return null;
		}

		const matches = linkHeader.match(/<([^>]+)>;\s*rel="memento"/g);
		if (matches && matches.length > 0) {
			const lastMatch = matches[matches.length - 1];
			const urlMatch = lastMatch.match(/<([^>]+)>/);
			return urlMatch ? urlMatch[1] : null;
		}
		return null;
	}

	async delay(ms) {
		return new Promise(resolve => Zotero.setTimeout(resolve, ms));
	}

	reloadSettings() {
		this.timeout = Zotero.Prefs.get("extensions.zotero.momento7.iaTimeout") || 120000; // Default: 2 minutes
		this.maxRetries = Zotero.Prefs.get("extensions.zotero.momento7.iaMaxRetries") || 3;
		this.retryDelay = Zotero.Prefs.get("extensions.zotero.momento7.iaRetryDelay") || 5000; // 5 seconds
	}
};
