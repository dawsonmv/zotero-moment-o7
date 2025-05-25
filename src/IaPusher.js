// Internet Archive Pusher for Zotero 7
// Uses Zotero.HTTP.request instead of XMLHttpRequest

Zotero.IaPusher = {
	/**
   * Check if an item has already been archived
   */
	isArchived: function (item) {
		const tags = item.getTags();
		return tags.some(tag => tag.tag === "archived");
	},

	/**
   * Construct the Internet Archive save URL
   */
	constructUri: function (uri) {
		if (!uri || typeof uri !== "string") {
			return null;
		}
		// Direct request to Internet Archive API - no proxy needed
		return "https://web.archive.org/save/" + uri;
	},

	/**
   * Check if a URL is valid for archiving
   */
	checkValidUrl: function (url) {
		const pattern = /^https?:\/\/.+/;
		return pattern.test(url);
	},

	/**
   * Extract archived URL from Link header
   */
	getLastMemento: function (linkHeader) {
		if (!linkHeader) {
			return null;
		}

		// Extract the last memento URL from the Link header
		const matches = linkHeader.match(/<([^>]+)>;\s*rel="memento"/g);
		if (matches && matches.length > 0) {
			const lastMatch = matches[matches.length - 1];
			const urlMatch = lastMatch.match(/<([^>]+)>/);
			return urlMatch ? urlMatch[1] : null;
		}
		return null;
	},

	/**
   * Extract date from archived URL
   */
	getDate: function (archivedUrl) {
		const match = archivedUrl.match(/\/web\/(\d{4,14})\//);
		if (!match) {
			return "";
		}

		const dateString = match[1];
		const year = dateString.slice(0, 4);
		const month = dateString.length >= 6 ? "-" + dateString.slice(4, 6) : "";
		const day = dateString.length >= 8 ? "-" + dateString.slice(6, 8) : "";
		const time = dateString.length >= 14 ?
			"T" + dateString.slice(8, 10) + ":" + dateString.slice(10, 12) + ":" + dateString.slice(12, 14) + "Z" : "";

		return year + month + day + time;
	},

	/**
   * Set the Extra field with archived URL
   */
	setExtra: function (item, archivedUrl) {
		const currentExtra = item.getField("extra");

		if (currentExtra.includes(archivedUrl)) {
			return;
		}

		const newExtra = currentExtra ?
			currentExtra + "; " + archivedUrl :
			archivedUrl;

		item.setField("extra", newExtra);
		return item.saveTx();
	},

	/**
   * Create a Robust Link HTML snippet
   */
	createRobustLinkHTML: function (originalUrl, archivedUrl, linkText, useArchivedHref = false) {
		const versionDate = this.getDate(archivedUrl);
		const href = useArchivedHref ? archivedUrl : originalUrl;

		return `<a href="${href}" data-originalurl="${originalUrl}" data-versionurl="${archivedUrl}" data-versiondate="${versionDate}">${linkText}</a>`;
	},

	/**
   * Escape HTML for display
   */
	escapeHtml: function (html) {
		return html.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	},

	/**
   * Attach a note with the archived link
   */
	attachAnchorNote: async function (item, archivedUrl) {
		if (!archivedUrl) {
			this.showNotification("Archive URL not found.", "error");
			return;
		}

		const url = item.getField("url");

		if (this.isArchived(item)) {
			return;
		}

		const note = new Zotero.Item("note");
		note.parentID = item.id;

		const linkText = item.getField("title") || url;
		const robustLinkOriginal = this.createRobustLinkHTML(url, archivedUrl, linkText, false);
		const robustLinkArchived = this.createRobustLinkHTML(url, archivedUrl, linkText, true);

		const noteContent = `<p>Original URL: ${this.createRobustLinkHTML(url, archivedUrl, url, false)}</p>
<p>Memento URL: ${this.createRobustLinkHTML(url, archivedUrl, archivedUrl, true)}</p>
<hr>
<p><strong>Step 1: Copy the appropriate HTML snippet below to include this Robust Link in your web page.</strong></p>
<hr>
<p>Copy this snippet if you want the link text to lead to the <strong>live web resource</strong> &lt;${url}&gt;:</p>
<p style="background-color: #f5f5f5; padding: 10px; font-family: monospace; font-size: 11px;">${this.escapeHtml(robustLinkOriginal)}</p>
<hr>
<p>Copy this snippet if you want the link text to lead to the <strong>memento</strong> &lt;${archivedUrl}&gt;:</p>
<p style="background-color: #f5f5f5; padding: 10px; font-family: monospace; font-size: 11px;">${this.escapeHtml(robustLinkArchived)}</p>
<hr>
<p><strong>Step 2: To make your Robust Links actionable, include this HTML in your web page, preferably inside the HEAD tag.</strong></p>
<p style="background-color: #f5f5f5; padding: 10px; font-family: monospace; font-size: 11px;">
&lt;!-- Robust Links CSS --&gt;<br>
&lt;link rel="stylesheet" type="text/css" href="https://doi.org/10.25776/z58z-r575" /&gt;<br>
&lt;!-- Robust Links Javascript --&gt;<br>
&lt;script type="text/javascript" src="https://doi.org/10.25776/h1fa-7a28"&gt;&lt;/script&gt;
</p>`;

		note.setNote(noteContent);
		await note.saveTx();
	},

	/**
   * Show notification window
   */
	showNotification: function (message, type = "info") {
		const notifWindow = new Zotero.ProgressWindow({ closeOnClick: true });
		notifWindow.changeHeadline(message);
		notifWindow.show();
		notifWindow.startCloseTimer(type === "error" ? 8000 : 3000);
	},

	/**
   * Handle response status
   */
	handleStatus: async function (item, status, archivedUrl) {
		let message = "";

		switch (status) {
		case 200:
			message = "Success! Archived to Internet Archive.";
			await this.attachAnchorNote(item, archivedUrl);
			break;
		case 401:
		case 403:
			message = "No access to the requested resource.";
			break;
		case 404:
			message = "Resource not found. Ensure URL is correct.";
			break;
		case 503:
		case 504:
			message = "Internet Archive may be down. Try again later.";
			break;
		default:
			message = `Error occurred. Try again later (Code ${status}).`;
		}

		if (message) {
			this.showNotification(message, status === 200 ? "success" : "error");
		}
	},

	/**
   * Get the best URL for archiving (prefer DOI if available)
   */
	getBestUrl: function (item) {
		let url = item.getField("url");
		const doi = item.getField("DOI");

		// Prefer DOI URL if available
		if (doi && doi !== "") {
			url = "https://doi.org/" + doi;
		}

		return url;
	},

	/**
   * Archive a single item
   */
	archiveItem: async function (item) {
		const url = this.getBestUrl(item);

		if (!this.checkValidUrl(url)) {
			Zotero.debug("Invalid URL for archiving: " + url);
			return;
		}

		if (this.isArchived(item)) {
			Zotero.debug("Item already archived: " + item.id);
			return;
		}

		const archiveUrl = this.constructUri(url);

		try {
			// Make request to Internet Archive
			const response = await Zotero.HTTP.request("GET", archiveUrl, {
				headers: {
					"User-Agent": "Zotero Moment-o7",
					"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
				},
				timeout: 60000, // 60 second timeout
				responseType: "text"
			});

			// Extract archived URL from response headers
			let archivedUrl = null;

			// Try to get from Link header first
			const linkHeader = response.getResponseHeader("Link");
			if (linkHeader) {
				archivedUrl = this.getLastMemento(linkHeader);
			}

			// If not in header, try to extract from response
			if (!archivedUrl && response.responseText) {
				// Look for the archived URL in the response
				const match = response.responseText.match(/https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/);
				if (match) {
					archivedUrl = match[0];
				}
			}

			if (archivedUrl) {
				await this.setExtra(item, archivedUrl);
				item.addTag("archived");
				await item.saveTx();
			}

			await this.handleStatus(item, response.status, archivedUrl);

		} catch (error) {
			Zotero.logError(`Archive request failed: ${error}`);

			// Handle specific error types with user-friendly messages
			let errorMessage = "Archive failed";

			if (error.status === 523) {
				// Cloudflare error - origin unreachable
				errorMessage = "This site cannot be archived (blocked by publisher)";
			} else if (error.status === 429) {
				// Rate limited
				errorMessage = "Archive service is rate limiting. Please wait a few minutes and try again";
			} else if (error.status === 403) {
				// Forbidden
				errorMessage = "Access denied - this site blocks archiving services";
			} else if (error.status === 404) {
				// Not found
				errorMessage = "The URL could not be found";
			} else if (error.status >= 500) {
				// Server error
				errorMessage = "Archive service is temporarily unavailable";
			} else if (error.message.includes("timeout")) {
				// Timeout
				errorMessage = "Archive request timed out - the site may be slow or blocking archiving";
			} else {
				// Generic error
				errorMessage = `Archive failed: ${error.message}`;
			}

			// Throw error to be caught by sendReq
			const err = new Error(errorMessage);
			err.originalError = error;
			throw err;
		}
	},

	/**
   * Archive selected items (called from menu)
   */
	sendReq: async function () {
		const pane = Zotero.getActiveZoteroPane();
		const selectedItems = pane.getSelectedItems();

		if (selectedItems.length === 0) {
			this.showNotification("No items selected", "error");
			return;
		}

		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		const progressWin = new Zotero.ProgressWindow({
			closeOnClick: true
		});
		progressWin.changeHeadline("Archiving to Internet Archive...");
		progressWin.show();

		for (const item of selectedItems) {
			// Skip notes and attachments
			if (item.isNote() || item.isAttachment()) {
				continue;
			}

			const url = item.getField("url");
			if (!url) {
				progressWin.addLines([`⚠️ ${item.getField("title")}: No URL`]);
				skippedCount++;
				continue;
			}

			if (this.isArchived(item)) {
				progressWin.addLines([`✓ ${item.getField("title")}: Already archived`]);
				skippedCount++;
				continue;
			}

			try {
				const title = item.getField("title");
				await this.archiveItem(item);
				processedCount++;
				// archiveItem adds the archived URL to Extra field
				const extra = item.getField("extra");
				const archiveMatch = extra.match(/Archived: (https:\/\/[^\s]+)/);
				if (archiveMatch) {
					progressWin.addLines([`✅ ${title}: Archived successfully`]);
				} else {
					progressWin.addLines([`✅ ${title}: Processed`]);
				}
			} catch (error) {
				errorCount++;
				progressWin.addLines([`❌ ${item.getField("title")}: ${error.message}`]);
			}
		}

		// Show summary
		const summary = [];
		if (processedCount > 0) summary.push(`${processedCount} archived`);
		if (skippedCount > 0) summary.push(`${skippedCount} skipped`);
		if (errorCount > 0) summary.push(`${errorCount} failed`);
		
		if (summary.length > 0) {
			progressWin.addDescription(`Complete: ${summary.join(", ")}`);
		}
		
		progressWin.startCloseTimer(8000);
	},

	/**
   * Extract DOI from response (for journal articles)
   */
	recognizeDoiPattern: function (responseText, tagName) {
		const doiPattern = /10\.\d{4,}\/[-._;()/:a-zA-Z0-9]+/;
		const toMatchTag = new RegExp(tagName + ".*?content=\"([^\"]+)\"", "i");
		const match = responseText.match(toMatchTag);

		if (match && match[1]) {
			const doiMatch = match[1].match(doiPattern);
			if (doiMatch) {
				return "https://doi.org/" + doiMatch[0];
			}
		}
		return "";
	},

	/**
   * Create DOI URL for journal articles
   */
	makeDoiUrl: function (responseText) {
		const dcId = this.recognizeDoiPattern(responseText, "DC.identifier");
		const citDoi = this.recognizeDoiPattern(responseText, "citation_doi");

		return dcId || citDoi || "";
	}
};