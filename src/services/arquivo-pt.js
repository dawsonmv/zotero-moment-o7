if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.ArquivoPtService = class extends Zotero.MomentO7.BaseArchiveService {
	constructor() {
		super({
			name: "Arquivo.pt",
			id: "arquivopt",
			requiresAuth: false,
			supportsMemento: true,
			rateLimit: 2000 // 2 seconds between requests
		});

		this.API_BASE = "https://arquivo.pt";
	}

	async isAvailable() {
		// Arquivo.pt is primarily for Portuguese content but accepts any URL
		return true;
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
		const url = this.getBestUrl(item);

		if (!this.checkValidUrl(url)) {
			throw new Error("Invalid URL for archiving");
		}

		// Check if already archived
		const existingArchive = await this.checkExistingArchive(url);
		if (existingArchive) {
			await this.saveToItem(item, existingArchive.url, {
				additionalInfo: `Archived on: ${existingArchive.date}`
			});

			item.addTag("archived:arquivopt");
			await item.saveTx();

			return {
				item: item,
				success: true,
				archivedUrl: existingArchive.url,
				message: "Found existing archive"
			};
		}

		await this.checkRateLimit();

		const progressWindow = this.showProgressWindow(
			"Archiving to Arquivo.pt",
			`Archiving: ${item.getField("title") || url}`
		);

		try {
			// Arquivo.pt Save Page Now equivalent
			const saveUrl = `${this.API_BASE}/save/${url}`;

			const response = await Zotero.HTTP.request("GET", saveUrl, {
				headers: {
					"User-Agent": "Zotero Moment-o7",
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
				},
				timeout: 90000, // 90 seconds - Arquivo.pt can be slow
				responseType: "text"
			});

			this.updateLastRequest();

			let archivedUrl = null;

			// Check if we got redirected to the archived version
			if (response.channel && response.channel.URI) {
				const finalUrl = response.channel.URI.spec;
				if (finalUrl.includes("/wayback/")) {
					archivedUrl = finalUrl;
				}
			}

			// Try to extract from response headers or content
			if (!archivedUrl) {
				// Look for the archived URL in the response
				const match = response.responseText.match(/https:\/\/arquivo\.pt\/wayback\/\d{14}[a-z]*\/[^\s"<>]+/);
				if (match) {
					archivedUrl = match[0];
				}
			}

			// If still no URL, try the search approach
			if (!archivedUrl) {
				await this.delay(2000); // Wait for archiving to complete
				const searchResult = await this.checkExistingArchive(url);
				if (searchResult) {
					archivedUrl = searchResult.url;
				}
			}

			if (archivedUrl) {
				await this.saveToItem(item, archivedUrl, {
					additionalInfo: "Portuguese Web Archive"
				});

				item.addTag("archived:arquivopt");
				await item.saveTx();

				progressWindow.close();
				this.showSuccess(`Archived successfully: ${archivedUrl}`);

				return {
					item: item,
					success: true,
					archivedUrl: archivedUrl
				};
			} else {
				throw new Error("Could not retrieve archived URL");
			}

		} catch (error) {
			progressWindow.close();

			let errorMessage = "Archive failed";

			if (error.status === 429) {
				errorMessage = "Rate limited. Please wait a few minutes and try again.";
			} else if (error.status === 404) {
				errorMessage = "URL not found or cannot be archived.";
			} else if (error.status >= 500) {
				errorMessage = "Arquivo.pt service is temporarily unavailable.";
			} else if (error.message && error.message.includes("timeout")) {
				errorMessage = "Archive request timed out. The site may be slow or blocking archiving.";
			} else if (error.message) {
				errorMessage = error.message;
			}

			throw new Error(errorMessage);
		}
	}

	async checkExistingArchive(url) {
		try {
			// Use Arquivo.pt TextSearch API
			const searchUrl = `${this.API_BASE}/textsearch?q=${encodeURIComponent(url)}&maxItems=1&dedupField=site`;

			const response = await Zotero.HTTP.request("GET", searchUrl, {
				headers: {
					"Accept": "application/json"
				},
				timeout: 30000,
				responseType: "json"
			});

			if (response.status === 200) {
				const data = JSON.parse(response.responseText);
				if (data.response_items && data.response_items.length > 0) {
					const item = data.response_items[0];
					return {
						url: `${this.API_BASE}/wayback/${item.tstamp}/${item.originalURL}`,
						date: this.formatTimestamp(item.tstamp)
					};
				}
			}
		} catch (e) {
			Zotero.debug(`MomentO7: Error checking Arquivo.pt: ${e}`);
		}

		return null;
	}

	formatTimestamp(timestamp) {
		// Convert Arquivo.pt timestamp (YYYYMMDDHHmmss) to readable date
		if (!timestamp || timestamp.length < 8) {
			return "";
		}

		const year = timestamp.substring(0, 4);
		const month = timestamp.substring(4, 6);
		const day = timestamp.substring(6, 8);

		return `${year}-${month}-${day}`;
	}

	checkValidUrl(url) {
		const pattern = /^https?:\/\/.+/;
		return pattern.test(url);
	}

	getBestUrl(item) {
		return item.getField("url");
	}

	async delay(ms) {
		return new Promise(resolve => Zotero.setTimeout(resolve, ms));
	}

	getMenuLabel() {
		return "Archive to Arquivo.pt (Portuguese Web Archive)";
	}

	getStatusLabel() {
		return "Archiving to Arquivo.pt...";
	}
};