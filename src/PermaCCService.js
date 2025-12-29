if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.PermaCCService = class extends Zotero.MomentO7.BaseArchiveService {
	constructor() {
		super({
			name: "Perma.cc",
			id: "permacc",
			requiresAuth: true,
			supportsMemento: false,
			rateLimit: 1000 // 1 second between requests
		});

		this.API_VERSION = "v1";
		this.API_BASE = "https://api.perma.cc";
		this.quotaCache = null;
		this.quotaCacheTime = null;
		this.QUOTA_CACHE_DURATION = 3600000; // 1 hour
	}

	async isAvailable() {
		// Check if API key is configured
		const apiKey = Zotero.Prefs.get("extensions.zotero.momento7.permaccApiKey");
		if (!apiKey) {
			return false;
		}

		// Check if quota is available
		try {
			const quota = await this.checkQuotaCached();
			return quota.remaining > 0;
		} catch (e) {
			Zotero.debug(`MomentO7: Error checking Perma.cc availability: ${e}`);
			return false;
		}
	}

	async checkQuotaCached() {
		const now = Date.now();
		if (!this.quotaCache || now - this.quotaCacheTime > this.QUOTA_CACHE_DURATION) {
			this.quotaCache = await this.checkQuota();
			this.quotaCacheTime = now;
		}
		return this.quotaCache;
	}

	async checkQuota() {
		const apiKey = this.getApiKey();
		if (!apiKey) {
			throw new Error("Perma.cc API key not configured");
		}

		const response = await Zotero.HTTP.request(
			"GET",
			`${this.API_BASE}/${this.API_VERSION}/user/`,
			{
				headers: {
					Authorization: `ApiKey ${apiKey}`,
					"Content-Type": "application/json"
				},
				timeout: 30000,
				responseType: "json"
			}
		);

		if (response.status !== 200) {
			throw new Error(`Failed to get user info: ${response.status}`);
		}

		const data = JSON.parse(response.responseText);
		return {
			used: data.link_limit - data.links_remaining,
			limit: data.link_limit,
			remaining: data.links_remaining,
			email: data.email
		};
	}

	getApiKey() {
		let apiKey = Zotero.Prefs.get("extensions.zotero.momento7.permaccApiKey");

		if (!apiKey) {
			// Prompt user for API key
			const prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(
				Components.interfaces.nsIPromptService
			);

			const input = { value: "" };
			const result = prompts.prompt(
				null,
				"Perma.cc API Key Required",
				"Please enter your Perma.cc API key.\n\nGet your free API key at: https://perma.cc/settings/tools\n\n(10 free archives per month)",
				input,
				null,
				{}
			);

			if (result && input.value) {
				apiKey = input.value.trim();
				Zotero.Prefs.set("extensions.zotero.momento7.permaccApiKey", apiKey);
			}
		}

		return apiKey;
	}

	async archive(items) {
		const results = [];

		// Check quota before starting
		const quota = await this.checkQuotaCached();
		if (quota.remaining === 0) {
			throw new Error(
				`Perma.cc monthly quota exceeded (${quota.limit} archives/month). Resets on the 1st of each month.`
			);
		}

		for (const item of items) {
			try {
				const result = await this.archiveItem(item);
				results.push(result);

				// Update quota cache
				if (this.quotaCache) {
					this.quotaCache.remaining--;
					this.quotaCache.used++;
				}
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

		// Check if already has a Perma.cc link
		if (this.hasPermaCCLink(item)) {
			return {
				item: item,
				success: true,
				message: "Already archived with Perma.cc"
			};
		}

		await this.checkRateLimit();

		const apiKey = this.getApiKey();
		if (!apiKey) {
			throw new Error("Perma.cc API key required");
		}

		const progressWindow = this.showProgressWindow(
			"Archiving to Perma.cc",
			`Archiving: ${item.getField("title") || url}`
		);

		try {
			// Get or create folder for Zotero archives
			const folderId = await this.getOrCreateFolder("Zotero Archives");

			// Create archive request
			const requestData = {
				url: url,
				title: item.getField("title") || undefined,
				folder: folderId || undefined
			};

			const response = await Zotero.HTTP.request(
				"POST",
				`${this.API_BASE}/${this.API_VERSION}/archives/`,
				{
					headers: {
						Authorization: `ApiKey ${apiKey}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify(requestData),
					timeout: 60000,
					responseType: "json"
				}
			);

			this.updateLastRequest();

			if (response.status === 201 || response.status === 200) {
				const data = JSON.parse(response.responseText);
				const permaCCUrl = `https://perma.cc/${data.guid}`;

				await this.saveToItem(item, permaCCUrl, {
					additionalInfo: `Perma.cc GUID: ${data.guid}`
				});

				item.addTag("archived:permacc");
				await item.saveTx();

				progressWindow.close();
				this.showSuccess(`Archived successfully: ${permaCCUrl}`);

				return {
					item: item,
					success: true,
					archivedUrl: permaCCUrl,
					guid: data.guid
				};
			} else {
				const errorData = JSON.parse(response.responseText);
				throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
			}
		} catch (error) {
			progressWindow.close();

			let errorMessage = "Archive failed";

			if (error.status === 401) {
				errorMessage = "Invalid API key. Please check your Perma.cc API key.";
				// Clear invalid API key
				Zotero.Prefs.clear("extensions.zotero.momento7.permaccApiKey");
			} else if (error.status === 403) {
				if (error.message && error.message.includes("link limit")) {
					errorMessage = "Monthly quota exceeded (10 free archives/month). Resets on the 1st.";
				} else {
					errorMessage = "Access denied. Please check your permissions.";
				}
			} else if (error.status === 429) {
				errorMessage = "Rate limited. Please wait a moment and try again.";
			} else if (error.status === 400) {
				errorMessage = "Invalid URL or request. Please check the URL.";
			} else if (error.message) {
				errorMessage = error.message;
			}

			throw new Error(errorMessage);
		}
	}

	async getOrCreateFolder(folderName) {
		const apiKey = this.getApiKey();
		if (!apiKey) {
			return null;
		}

		try {
			// Get existing folders
			const response = await Zotero.HTTP.request(
				"GET",
				`${this.API_BASE}/${this.API_VERSION}/folders/`,
				{
					headers: {
						Authorization: `ApiKey ${apiKey}`,
						"Content-Type": "application/json"
					},
					timeout: 30000,
					responseType: "json"
				}
			);

			if (response.status === 200) {
				const data = JSON.parse(response.responseText);
				const folders = data.objects || data;

				// Look for existing folder
				const existingFolder = folders.find(f => f.name === folderName);
				if (existingFolder) {
					return existingFolder.id;
				}

				// Create new folder
				const createResponse = await Zotero.HTTP.request(
					"POST",
					`${this.API_BASE}/${this.API_VERSION}/folders/`,
					{
						headers: {
							Authorization: `ApiKey ${apiKey}`,
							"Content-Type": "application/json"
						},
						body: JSON.stringify({ name: folderName }),
						timeout: 30000,
						responseType: "json"
					}
				);

				if (createResponse.status === 201 || createResponse.status === 200) {
					const newFolder = JSON.parse(createResponse.responseText);
					return newFolder.id;
				}
			}
		} catch (e) {
			Zotero.debug(`MomentO7: Error managing Perma.cc folders: ${e}`);
		}

		return null;
	}

	hasPermaCCLink(item) {
		const extra = item.getField("extra") || "";
		return (
			extra.includes("perma.cc/") || item.getTags().some(tag => tag.tag === "archived:permacc")
		);
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

	getMenuLabel() {
		return "Archive to Perma.cc (Academic)";
	}

	getStatusLabel() {
		return "Archiving to Perma.cc...";
	}
};
