if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.UKWebArchiveService = class extends Zotero.MomentO7.BaseArchiveService {
	constructor() {
		super({
			name: "UK Web Archive",
			id: "ukwebarchive",
			requiresAuth: false,
			supportsMemento: true,
			rateLimit: 2000 // 2 seconds between requests
		});
	}

	async isAvailable() {
		// UK Web Archive has geographic restrictions
		// Only available for UK websites
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

		// Check if URL is eligible (UK domains)
		if (!this.isUKDomain(url)) {
			throw new Error("UK Web Archive only accepts UK websites (.uk domains or UK-based content)");
		}

		if (this.hasUKWebArchiveLink(item)) {
			return {
				item: item,
				success: true,
				message: "Already archived with UK Web Archive"
			};
		}

		await this.checkRateLimit();

		const progressWindow = this.showProgressWindow(
			"Archiving to UK Web Archive",
			`Archiving: ${item.getField("title") || url}`
		);

		try {
			// UK Web Archive uses a nomination system
			// Submit URL for archiving
			const nominateUrl = "https://www.webarchive.org.uk/en/ukwa/api/nomination";

			const response = await Zotero.HTTP.request("POST", nominateUrl, {
				headers: {
					"Content-Type": "application/json",
					"User-Agent": "Zotero Moment-o7"
				},
				body: JSON.stringify({
					url: url,
					title: item.getField("title") || undefined,
					subject: "Academic Research",
					nominator: "Zotero User"
				}),
				timeout: 30000,
				responseType: "json"
			});

			this.updateLastRequest();

			if (response.status === 200 || response.status === 201) {
				// UK Web Archive doesn't provide immediate archives
				// It's a nomination system, so we can only confirm submission
				const message =
					"Nominated for archiving. UK Web Archive will review and archive if accepted.";

				// Add note about nomination
				const note = new Zotero.Item("note");
				note.setNote(`<p>URL nominated to UK Web Archive for preservation.</p>
<p>Date: ${new Date().toLocaleDateString()}</p>
<p>URL: ${url}</p>
<p>Note: UK Web Archive reviews nominations before archiving. Check back later at:</p>
<p><a href="https://www.webarchive.org.uk/en/ukwa/search?text=${encodeURIComponent(url)}">Search UK Web Archive</a></p>`);
				note.parentID = item.id;
				await note.saveTx();

				item.addTag("nominated:ukwebarchive");
				await item.saveTx();

				progressWindow.close();
				this.showSuccess(message);

				return {
					item: item,
					success: true,
					message: message
				};
			} else {
				throw new Error(`Nomination failed: HTTP ${response.status}`);
			}
		} catch (error) {
			progressWindow.close();

			// Try alternative approach - check if already archived
			try {
				const searchUrl = `https://www.webarchive.org.uk/en/ukwa/search?text=${encodeURIComponent(url)}&page=1&per_page=1`;
				const searchResponse = await Zotero.HTTP.request("GET", searchUrl, {
					timeout: 30000
				});

				if (
					searchResponse.status === 200 &&
					searchResponse.responseText.includes("results found")
				) {
					const message = "URL may already be archived. Check UK Web Archive search.";
					this.showSuccess(message);

					return {
						item: item,
						success: true,
						message: message
					};
				}
			} catch {
				// Ignore search errors
			}

			let errorMessage = "Archive nomination failed";

			if (error.status === 429) {
				errorMessage = "Rate limited. Please wait a few minutes and try again.";
			} else if (error.status === 400) {
				errorMessage = "Invalid request. URL may not be eligible for UK Web Archive.";
			} else if (error.message) {
				errorMessage = error.message;
			}

			throw new Error(errorMessage);
		}
	}

	isUKDomain(url) {
		try {
			// Use string parsing as URL might not be available in all contexts
			const match = url.match(/^https?:\/\/([^/]+)/);
			if (!match) {
				return false;
			}

			const hostname = match[1].toLowerCase();

			// Check for UK domains
			if (
				hostname.endsWith(".uk") ||
				hostname.endsWith(".scot") ||
				hostname.endsWith(".wales") ||
				hostname.endsWith(".cymru") ||
				hostname.endsWith(".london")
			) {
				return true;
			}

			// Check for UK government domains
			if (
				hostname.endsWith(".gov.uk") ||
				hostname.endsWith(".nhs.uk") ||
				hostname.endsWith(".police.uk") ||
				hostname.endsWith(".mod.uk")
			) {
				return true;
			}

			// Check for UK academic domains
			if (hostname.endsWith(".ac.uk")) {
				return true;
			}

			return false;
		} catch {
			return false;
		}
	}

	hasUKWebArchiveLink(item) {
		const tags = item.getTags();
		return tags.some(
			tag => tag.tag === "nominated:ukwebarchive" || tag.tag === "archived:ukwebarchive"
		);
	}

	checkValidUrl(url) {
		const pattern = /^https?:\/\/.+/;
		return pattern.test(url);
	}

	getBestUrl(item) {
		return item.getField("url");
	}

	getMenuLabel() {
		return "Nominate to UK Web Archive";
	}

	getStatusLabel() {
		return "Nominating to UK Web Archive...";
	}
};
