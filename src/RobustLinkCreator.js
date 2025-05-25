// Robust Link Creator for Zotero 7
// Creates combined robust links from multiple archive services

Zotero.RobustLinkCreator = {
	/**
   * Archive to all available services
   */
	archiveToAll: async function () {
		const ZoteroPane = Zotero.getActiveZoteroPane();
		const selectedItems = ZoteroPane.getSelectedItems();

		if (selectedItems.length === 0) {
			return;
		}

		const progressWin = new Zotero.ProgressWindow({
			closeOnClick: true
		});
		progressWin.changeHeadline("Creating Robust Links...");
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
				progressWin.addLines([`Processing: ${item.getField("title")}`]);

				// Check if already has Robust Link attachment
				const attachments = item.getAttachments();
				for (const attachmentId of attachments) {
					const attachment = Zotero.Items.get(attachmentId);
					if (attachment.getField("title") === "Robust Link") {
						progressWin.addLines(["✓ Already has Robust Link"]);
						continue;
					}
				}

				let iaUrl = null;
				let atUrl = null;
				const errors = [];

				// Try Internet Archive
				try {
					progressWin.addLines(["  → Archiving to Internet Archive..."]);
					iaUrl = await this.archiveToIA(item);
					progressWin.addLines(["  ✓ Internet Archive complete"]);
				} catch (e) {
					errors.push(`Internet Archive: ${e.message}`);
					progressWin.addLines([`  ✗ Internet Archive failed: ${e.message}`]);
				}

				// Try Archive.today
				try {
					progressWin.addLines(["  → Archiving to Archive.today..."]);
					const result = await Zotero.ArchiveTodayPusher.archiveUrl(item);
					if (result.archivedUrl) {
						atUrl = result.archivedUrl;
						progressWin.addLines(["  ✓ Archive.today complete"]);
					}
				} catch (e) {
					errors.push(`Archive.today: ${e.message}`);
					progressWin.addLines([`  ✗ Archive.today failed: ${e.message}`]);
				}

				// Create Robust Link attachment if we have at least one archive
				if (iaUrl || atUrl) {
					await this.createRobustLinkAttachment(item, url, iaUrl, atUrl);
					progressWin.addLines(["✓ Robust Link created"]);
				} else {
					progressWin.addLines(["✗ No archives created"]);
				}

			} catch (error) {
				progressWin.addLines([`✗ Error: ${error.message}`]);
				Zotero.logError(error);
			}
		}

		progressWin.startCloseTimer(8000);
	},

	/**
   * Archive to Internet Archive
   */
	archiveToIA: async function (item) {
		const url = item.getField("url");
		const saveUrl = "https://web.archive.org/save/" + url;

		const response = await Zotero.HTTP.request("GET", saveUrl, {
			timeout: 30000,
			responseType: "text"
		});

		if (response.status === 200 || response.status === 302) {
			const linkHeader = response.getResponseHeader("Link");
			const archivedUrl = Zotero.IaPusher.getLastMemento(linkHeader);

			if (archivedUrl) {
				// Add to Extra field
				await Zotero.IaPusher.setExtra(item, archivedUrl);
				item.addTag("archived");
				await item.saveTx();
				return archivedUrl;
			}
		}

		throw new Error("Failed to get archived URL");
	},

	/**
   * Create Robust Link attachment
   */
	createRobustLinkAttachment: async function (item, originalUrl, iaUrl, atUrl) {
		// Create link attachment
		const attachment = await Zotero.Attachments.linkFromURL({
			url: originalUrl,
			parentItemID: item.id,
			title: "Robust Link"
		});

		// Determine which URL to use as primary memento
		const mementoUrl = iaUrl || atUrl;
		const mementoDate = new Date().toISOString();

		// Create note content
		let noteContent = "<div style=\"font-family: sans-serif;\">";

		// Archive status
		noteContent += "<p><strong>Archive Status:</strong></p>";
		noteContent += "<ul>";
		if (iaUrl) {
			noteContent += `<li>Internet Archive: <a href="${iaUrl}">${iaUrl}</a></li>`;
		}
		if (atUrl) {
			noteContent += `<li>Archive.today: <a href="${atUrl}">${atUrl}</a></li>`;
		}
		noteContent += "</ul>";

		// Original and Memento URLs with Robust Link data
		const linkText = item.getField("title") || originalUrl;
		noteContent += `<p>Original URL: <a href="${originalUrl}" data-originalurl="${originalUrl}" data-versionurl="${mementoUrl}" data-versiondate="${mementoDate}">${originalUrl}</a></p>`;
		noteContent += `<p>Memento URL: <a href="${mementoUrl}" data-originalurl="${originalUrl}" data-versionurl="${mementoUrl}" data-versiondate="${mementoDate}">${mementoUrl}</a></p>`;

		noteContent += "<hr>";
		noteContent += "<p><strong>Step 1: Copy the appropriate HTML snippet below to include this Robust Link in your web page.</strong></p>";
		noteContent += "<hr>";

		// Snippet for live resource
		const robustLinkOriginal = `<a href="${originalUrl}" data-originalurl="${originalUrl}" data-versionurl="${mementoUrl}" data-versiondate="${mementoDate}">${linkText}</a>`;
		noteContent += `<p>Copy this snippet if you want the link text to lead to the <strong>live web resource</strong> &lt;${originalUrl}&gt;:</p>`;
		noteContent += `<p style="background-color: #f5f5f5; padding: 10px; font-family: monospace; font-size: 11px; overflow-x: auto;">${this.escapeHtml(robustLinkOriginal)}</p>`;

		noteContent += "<hr>";

		// Snippet for memento
		const robustLinkArchived = `<a href="${mementoUrl}" data-originalurl="${originalUrl}" data-versionurl="${mementoUrl}" data-versiondate="${mementoDate}">${linkText}</a>`;
		noteContent += `<p>Copy this snippet if you want the link text to lead to the <strong>memento</strong> &lt;${mementoUrl}&gt;:</p>`;
		noteContent += `<p style="background-color: #f5f5f5; padding: 10px; font-family: monospace; font-size: 11px; overflow-x: auto;">${this.escapeHtml(robustLinkArchived)}</p>`;

		noteContent += "<hr>";
		noteContent += "<p><strong>Step 2: To make your Robust Links actionable, include this HTML in your web page, preferably inside the HEAD tag.</strong></p>";
		noteContent += "<p style=\"background-color: #f5f5f5; padding: 10px; font-family: monospace; font-size: 11px;\">";
		noteContent += "&lt;!-- Robust Links CSS --&gt;<br>";
		noteContent += "&lt;link rel=\"stylesheet\" type=\"text/css\" href=\"https://doi.org/10.25776/z58z-r575\" /&gt;<br>";
		noteContent += "&lt;!-- Robust Links Javascript --&gt;<br>";
		noteContent += "&lt;script type=\"text/javascript\" src=\"https://doi.org/10.25776/h1fa-7a28\"&gt;&lt;/script&gt;";
		noteContent += "</p>";

		noteContent += "</div>";

		// Set note on attachment
		attachment.setNote(noteContent);
		await attachment.saveTx();

		// Add tag to item
		item.addTag("robust-link");
		await item.saveTx();
	},

	/**
   * Escape HTML for display
   */
	escapeHtml: function (html) {
		return html.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	},

	/**
   * Check if item has Robust Link attachment
   */
	hasRobustLink: function (item) {
		const attachments = item.getAttachments();
		for (const attachmentId of attachments) {
			const attachment = Zotero.Items.get(attachmentId);
			if (attachment.getField("title") === "Robust Link") {
				return true;
			}
		}
		return false;
	}
};