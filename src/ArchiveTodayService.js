if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.ArchiveTodayService = class extends Zotero.MomentO7.BaseArchiveService {
	constructor() {
		super({
			name: "Archive.today",
			id: "archivetoday",
			requiresAuth: false,
			supportsMemento: true,
			rateLimit: 5000 // 5 seconds between requests
		});

		this.WORKER_URL = "https://zotero-archive-proxy.2pc9prprn5.workers.dev";
	}

	async isAvailable() {
		// Check if worker URL is configured
		const savedUrl = Zotero.Prefs.get("extensions.zotero.momento7.archiveTodayWorkerUrl");
		if (savedUrl) {
			this.WORKER_URL = savedUrl;
		}
		return true; // Always available if worker is configured
	}

	getMenuLabel() {
		return "Archive to Archive.today";
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

		if (this.isArchived(item)) {
			return {
				item: item,
				success: true,
				message: "Already archived to Archive.today"
			};
		}

		await this.checkRateLimit();

		const progressWindow = this.showProgressWindow(
			"Archiving to Archive.today",
			`Archiving: ${item.getField("title") || url}`
		);

		try {
			const requestUrl = `${this.WORKER_URL}/?url=${encodeURIComponent(url)}`;

			const response = await Zotero.HTTP.request("GET", requestUrl, {
				timeout: 30000,
				responseType: "json"
			});

			this.updateLastRequest();

			if (response.status !== 200) {
				throw new Error(`Worker returned status ${response.status}`);
			}

			const data = response.response;

			if (!data.success) {
				throw new Error(data.error || "Archive failed");
			}

			if (data.archivedUrl) {
				await this.saveToItem(item, data.archivedUrl, {
					additionalInfo: data.isInProgress
						? "Note: Archive.today is still processing this URL. The archived version may take a few minutes to complete."
						: null
				});

				item.addTag("archived-archive.today");
				await item.saveTx();

				progressWindow.close();

				const status = data.isInProgress
					? "Archiving in progress (may take a few minutes)"
					: "Archived successfully";
				this.showSuccess(`${status}: ${data.archivedUrl}`);

				return {
					item: item,
					success: true,
					archivedUrl: data.archivedUrl,
					isInProgress: data.isInProgress
				};
			} else {
				throw new Error("No archived URL returned");
			}
		} catch (error) {
			progressWindow.close();

			let errorMessage = "Archive failed";

			if (error.message.includes("blocked") || error.message.includes("403")) {
				errorMessage = "This site blocks archiving services";
			} else if (error.message.includes("rate") || error.message.includes("429")) {
				errorMessage = "Archive.today is rate limiting. Please wait a few minutes and try again";
			} else if (error.message.includes("timeout")) {
				errorMessage = "Archive request timed out";
			} else if (error.message) {
				errorMessage = error.message;
			}

			throw new Error(errorMessage);
		}
	}

	isArchived(item) {
		const extra = item.getField("extra");
		return (
			extra.includes("archive.today") ||
			extra.includes("archive.ph") ||
			extra.includes("archive.is") ||
			extra.includes("archive.li") ||
			extra.includes("archiveTodayArchived:")
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

	async saveToItem(item, archivedUrl, metadata = {}) {
		const originalUrl = item.getField("url");
		const linkText = item.getField("title") || originalUrl;

		let extra = item.getField("extra") || "";
		const archiveField = `archiveTodayArchived: ${archivedUrl}`;
		if (!extra.includes(archiveField) && !extra.includes("Archive.today:")) {
			const newEntry = `Archive.today: ${archivedUrl}`;
			extra = extra ? extra + "\n" + newEntry : newEntry;
			item.setField("extra", extra);
		}

		const robustLinkHTML = this.createRobustLinkHTML(originalUrl, archivedUrl, linkText);
		const noteContent = `<p>Archived version: ${robustLinkHTML}</p>
<p>Archive date: ${new Date().toLocaleDateString()}</p>
<p>Archive service: ${this.name}</p>
${metadata.additionalInfo ? `<p>${metadata.additionalInfo}</p>` : ""}

<p><strong>Robust Link HTML (copy and paste):</strong></p>
<pre>${this.escapeHtml(robustLinkHTML)}</pre>`;

		const note = new Zotero.Item("note");
		note.setNote(noteContent);
		note.parentID = item.id;
		await note.saveTx();

		return note;
	}
};
