// Perma.cc Archiving for Zotero 7
// Requires API key from https://perma.cc/

Zotero.PermaCCPusher = {
	API_BASE_URL: "https://api.perma.cc/v1/",
	ARCHIVE_URL: "https://api.perma.cc/v1/archives/",
	USER_URL: "https://api.perma.cc/v1/user/",

	/**
	 * Get API key from preferences
	 */
	getApiKey: function () {
		return Zotero.Prefs.get("extensions.zotero-moment-o7.permacc.apiKey", true) || "";
	},

	/**
	 * Set API key in preferences
	 */
	setApiKey: function (apiKey) {
		Zotero.Prefs.set("extensions.zotero-moment-o7.permacc.apiKey", apiKey, true);
	},

	/**
	 * Check if API key is configured
	 */
	hasApiKey: function () {
		return this.getApiKey().length > 0;
	},

	/**
	 * Verify API key and get user info
	 */
	verifyApiKey: async function () {
		const apiKey = this.getApiKey();
		if (!apiKey) {
			throw new Error("No API key configured");
		}

		try {
			const response = await Zotero.HTTP.request("GET", this.USER_URL, {
				headers: {
					"Authorization": `ApiKey ${apiKey}`,
					"Content-Type": "application/json"
				},
				timeout: 10000,
				responseType: "json"
			});

			if (response.status === 200) {
				return response.response;
			}
		} catch (error) {
			if (error.status === 401) {
				throw new Error("Invalid API key");
			}
			throw error;
		}
	},

	/**
	 * Check remaining quota
	 */
	checkQuota: async function () {
		const userInfo = await this.verifyApiKey();
		// Perma.cc returns quota info in user endpoint
		return {
			used: userInfo.links_remaining || 0,
			limit: userInfo.link_limit || 10,
			remaining: (userInfo.link_limit || 10) - (userInfo.links_remaining || 0)
		};
	},

	/**
	 * Create a Perma.cc archive
	 */
	createArchive: async function (url, title = "") {
		const apiKey = this.getApiKey();
		if (!apiKey) {
			throw new Error("Perma.cc API key not configured");
		}

		const requestBody = {
			url: url,
			title: title || url,
			is_private: false // Public by default
		};

		try {
			const response = await Zotero.HTTP.request("POST", this.ARCHIVE_URL, {
				headers: {
					"Authorization": `ApiKey ${apiKey}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(requestBody),
				timeout: 30000,
				responseType: "json"
			});

			if (response.status === 201) {
				const data = response.response;
				return {
					success: true,
					guid: data.guid,
					url: `https://perma.cc/${data.guid}`,
					createdAt: data.creation_timestamp,
					title: data.title
				};
			}
		} catch (error) {
			// Handle specific Perma.cc errors
			if (error.status === 401) {
				throw new Error("Invalid API key");
			} else if (error.status === 403) {
				// Check if it's a quota issue
				const quota = await this.checkQuota().catch(() => null);
				if (quota && quota.remaining <= 0) {
					throw new Error("Perma.cc monthly quota exceeded");
				}
				throw new Error("Access denied");
			} else if (error.status === 400) {
				throw new Error("Invalid URL or request");
			} else if (error.status === 429) {
				throw new Error("Rate limited - please wait before trying again");
			}
			throw error;
		}
	},

	/**
	 * Check if item already has Perma.cc archive
	 */
	isArchived: function (item) {
		const extra = item.getField("extra");
		return extra.includes("Perma.cc:");
	},

	/**
	 * Set the Extra field with Perma.cc URL
	 */
	setExtra: function (item, permaUrl) {
		const currentExtra = item.getField("extra");

		if (currentExtra.includes(permaUrl)) {
			return;
		}

		const archiveInfo = `Perma.cc: ${permaUrl}`;
		const newExtra = currentExtra ?
			currentExtra + "\n" + archiveInfo :
			archiveInfo;

		item.setField("extra", newExtra);
		return item.saveTx();
	},

	/**
	 * Archive selected items to Perma.cc
	 */
	archiveSelected: async function () {
		if (!this.hasApiKey()) {
			// Show dialog to configure API key
			const input = prompt(
				"Please enter your Perma.cc API key.\n\n" +
				"Get your free API key at: https://perma.cc/settings/tools\n" +
				"(10 free archives per month)"
			);

			if (input && input.trim()) {
				this.setApiKey(input.trim());
			} else {
				return;
			}
		}

		const ZoteroPane = Zotero.getActiveZoteroPane();
		const selectedItems = ZoteroPane.getSelectedItems();

		if (selectedItems.length === 0) {
			return;
		}

		// Check quota first
		let quota;
		try {
			quota = await this.checkQuota();
			if (quota.remaining <= 0) {
				alert(`Perma.cc quota exceeded. You've used ${quota.used}/${quota.limit} archives this month.`);
				return;
			}
		} catch (error) {
			alert(`Perma.cc error: ${error.message}`);
			return;
		}

		const progressWin = new Zotero.ProgressWindow({
			closeOnClick: true
		});
		progressWin.changeHeadline("Archiving to Perma.cc...");
		progressWin.addDescription(`Remaining quota: ${quota.remaining}/${quota.limit}`);
		progressWin.show();

		let successCount = 0;
		let errorCount = 0;

		for (const item of selectedItems) {
			if (item.isNote() || item.isAttachment()) {
				continue;
			}

			const url = item.getField("url");
			if (!url) {
				continue;
			}

			try {
				// Check if already archived
				if (this.isArchived(item)) {
					progressWin.addLines([`✓ ${item.getField("title")}: Already archived`]);
					continue;
				}

				// Create archive
				const result = await this.createArchive(url, item.getField("title"));

				if (result.success) {
					// Update item
					await this.setExtra(item, result.url);
					item.addTag("archived-perma.cc");
					await item.saveTx();

					// Create note with details
					await this.attachArchiveNote(item, result.url, url);

					successCount++;
					progressWin.addLines([`✓ ${item.getField("title")}: Archived at ${result.url}`]);

					// Update remaining quota
					quota.remaining--;
					if (quota.remaining <= 2) {
						progressWin.addDescription(`Warning: Only ${quota.remaining} archives remaining this month`);
					}
				}
			} catch (error) {
				errorCount++;

				// User-friendly error messages
				let errorMessage = error.message;
				if (errorMessage.includes("quota")) {
					errorMessage = "Monthly quota exceeded (10 free/month)";
				} else if (errorMessage.includes("Invalid API")) {
					errorMessage = "Invalid API key";
				} else if (errorMessage.includes("rate")) {
					errorMessage = "Rate limited - wait before trying again";
				}

				progressWin.addLines([`✗ ${item.getField("title")}: ${errorMessage}`]);
				Zotero.logError(`Perma.cc error for ${url}: ${error}`);

				// Stop if quota exceeded
				if (errorMessage.includes("quota")) {
					break;
				}
			}
		}

		// Show summary
		const summary = `Completed: ${successCount} archived, ${errorCount} failed`;
		progressWin.addDescription(summary);
		progressWin.startCloseTimer(8000);
	},

	/**
	 * Attach a note with the Perma.cc link
	 */
	attachArchiveNote: async function (item, permaUrl, originalUrl) {
		const note = new Zotero.Item("note");
		note.parentKey = item.key;
		note.libraryID = item.libraryID;

		const noteContent = `<p><b>Perma.cc Archive</b></p>
<p>Original URL: <a href="${originalUrl}">${originalUrl}</a></p>
<p>Permanent URL: <a href="${permaUrl}">${permaUrl}</a></p>
<p><small>Perma.cc archives are permanent and citable. This link will not break.</small></p>`;

		note.setNote(noteContent);
		await note.saveTx();
	}
};