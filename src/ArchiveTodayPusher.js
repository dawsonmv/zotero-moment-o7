// Archive.today Pusher for Zotero 7
// Uses Cloudflare Worker proxy to bypass CORS restrictions

Zotero.ArchiveTodayPusher = {
	// Hardcoded Cloudflare Worker URL
	WORKER_URL: "https://zotero-archive-proxy.2pc9prprn5.workers.dev",

	/**
   * Set the Cloudflare Worker URL
   */
	setWorkerUrl: function (url) {
		this.WORKER_URL = url;
		Zotero.Prefs.set("extensions.zotero.momento7.archiveTodayWorkerUrl", url);
	},

	/**
   * Get the configured Worker URL
   */
	getWorkerUrl: function () {
		const savedUrl = Zotero.Prefs.get("extensions.zotero.momento7.archiveTodayWorkerUrl");
		if (savedUrl) {
			this.WORKER_URL = savedUrl;
		}
		return this.WORKER_URL;
	},

	/**
   * Check if an item has already been archived to Archive.today
   */
	isArchived: function (item) {
		const extra = item.getField("extra");
		return extra.includes("archive.today") || extra.includes("archive.ph") ||
           extra.includes("archive.is") || extra.includes("archive.li");
	},

	/**
   * Check if URL is valid for archiving
   */
	checkValidUrl: function (url) {
		const pattern = /^https?:\/\/.+/;
		return pattern.test(url);
	},

	/**
   * Set the Extra field with archived URL
   */
	setExtra: function (item, archivedUrl) {
		const currentExtra = item.getField("extra");

		if (currentExtra.includes(archivedUrl)) {
			return;
		}

		const archiveInfo = `Archive.today: ${archivedUrl}`;
		const newExtra = currentExtra ?
			currentExtra + "\n" + archiveInfo :
			archiveInfo;

		item.setField("extra", newExtra);
		return item.saveTx();
	},

	/**
   * Create a Robust Link HTML snippet
   */
	createRobustLinkHTML: function (originalUrl, archivedUrl, linkText, useArchivedHref = false) {
		const versionDate = new Date().toISOString();
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
	attachArchiveNote: async function (item, archivedUrl, originalUrl) {
		if (!archivedUrl) {
			return;
		}

		const note = new Zotero.Item("note");
		note.parentKey = item.key;
		note.libraryID = item.libraryID;

		const linkText = item.getField("title") || originalUrl;
		const robustLinkOriginal = this.createRobustLinkHTML(originalUrl, archivedUrl, linkText, false);
		const robustLinkArchived = this.createRobustLinkHTML(originalUrl, archivedUrl, linkText, true);

		const noteContent = `<p>Original URL: ${this.createRobustLinkHTML(originalUrl, archivedUrl, originalUrl, false)}</p>
<p>Memento URL: ${this.createRobustLinkHTML(originalUrl, archivedUrl, archivedUrl, true)}</p>
<hr>
<p><strong>Step 1: Copy the appropriate HTML snippet below to include this Robust Link in your web page.</strong></p>
<hr>
<p>Copy this snippet if you want the link text to lead to the <strong>live web resource</strong> &lt;${originalUrl}&gt;:</p>
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
   * Archive a URL using the Cloudflare Worker
   */
	archiveUrl: async function (item) {
		const url = this.getBestUrl(item);

		if (!this.checkValidUrl(url)) {
			throw new Error("Invalid URL");
		}

		if (this.isArchived(item)) {
			throw new Error("Already archived to Archive.today");
		}

		// Make request to Cloudflare Worker
		const workerUrl = this.getWorkerUrl();
		const requestUrl = `${workerUrl}/?url=${encodeURIComponent(url)}`;

		const response = await Zotero.HTTP.request("GET", requestUrl, {
			timeout: 30000,
			responseType: "json"
		});

		if (response.status !== 200) {
			throw new Error(`Worker returned status ${response.status}`);
		}

		const data = response.response;

		if (!data.success) {
			throw new Error(data.error || "Archive failed");
		}

		return data;
	},

	/**
   * Main function to archive selected items
   */
	archiveSelected: async function () {
		const ZoteroPane = Zotero.getActiveZoteroPane();
		const selectedItems = ZoteroPane.getSelectedItems();

		if (selectedItems.length === 0) {
			return;
		}

		let successCount = 0;
		let errorCount = 0;

		// Show progress window
		const progressWin = new Zotero.ProgressWindow({
			closeOnClick: true
		});
		progressWin.changeHeadline("Archiving to Archive.today...");
		progressWin.show();

		for (const item of selectedItems) {
			if (item.isNote() || item.isAttachment()) {
				continue;
			}

			const url = item.getField("url");
			if (!url) {
				continue;
			}

			try {
				// Archive the URL
				const result = await this.archiveUrl(item);

				if (result.archivedUrl) {
					// Update item with archived URL
					await this.setExtra(item, result.archivedUrl);
					await this.attachArchiveNote(item, result.archivedUrl, url);

					// Add tag
					item.addTag("archived-archive.today");
					await item.saveTx();

					successCount++;

					// Show status
					const icon = result.isInProgress ? "⏳" : "✓";
					const status = result.isInProgress ?
						"Archiving in progress" :
						"Archived successfully";
					progressWin.addLines([`${icon} ${item.getField("title")}: ${status}`]);
				}
			} catch (error) {
				errorCount++;

				// Handle specific error types with user-friendly messages
				let errorMessage = error.message;

				if (error.message.includes("blocked") || error.message.includes("403")) {
					errorMessage = "Site blocks archiving";
				} else if (error.message.includes("rate") || error.message.includes("429")) {
					errorMessage = "Rate limited - try again later";
				} else if (error.message.includes("timeout")) {
					errorMessage = "Request timed out";
				} else if (error.message.includes("already archived")) {
					errorMessage = "Already archived";
				}

				progressWin.addLines([`✗ ${item.getField("title")}: ${errorMessage}`]);
				Zotero.logError(`Archive.today error for ${url}: ${error}`);
			}
		}

		// Show summary
		const summary = `Completed: ${successCount} succeeded, ${errorCount} failed`;
		progressWin.addDescription(summary);
		progressWin.startCloseTimer(8000);
	},

	/**
   * Initialize the module
   */
	init: function () {
		// Worker URL is now hardcoded
		Zotero.log("Archive.today Pusher: Using Cloudflare Worker at " + this.WORKER_URL);
	}
};