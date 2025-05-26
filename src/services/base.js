if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.BaseArchiveService = class {
	constructor(config = {}) {
		this.name = config.name || "Unknown Service";
		this.id = config.id || "unknown";
		this.requiresAuth = config.requiresAuth || false;
		this.supportsMemento = config.supportsMemento || false;
		this.rateLimit = config.rateLimit || null;
		this.lastRequest = null;
	}

	async isAvailable() {
		throw new Error("isAvailable() must be implemented by subclass");
	}

	async archive(_items) {
		throw new Error("archive() must be implemented by subclass");
	}

	getMenuLabel() {
		return `Archive to ${this.name}`;
	}

	getStatusLabel() {
		return `Archiving to ${this.name}...`;
	}

	async checkRateLimit() {
		if (!this.rateLimit || !this.lastRequest) {
			return true;
		}

		const timeSinceLastRequest = Date.now() - this.lastRequest;
		if (timeSinceLastRequest < this.rateLimit) {
			const waitTime = Math.ceil((this.rateLimit - timeSinceLastRequest) / 1000);
			throw new Error(`Rate limit: Please wait ${waitTime} seconds before trying again`);
		}

		return true;
	}

	updateLastRequest() {
		this.lastRequest = Date.now();
	}

	createRobustLinkHTML(originalUrl, archivedUrl, linkText, useArchivedHref = false) {
		const versionDate = new Date().toISOString();
		const href = useArchivedHref ? archivedUrl : originalUrl;
		return `<a href="${href}" data-originalurl="${this.escapeHtml(originalUrl)}" data-versionurl="${this.escapeHtml(archivedUrl)}" data-versiondate="${versionDate}">${this.escapeHtml(linkText)}</a>`;
	}

	escapeHtml(text) {
		if (!text) {
			return "";
		}
		const map = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"\"": "&quot;",
			"'": "&#039;"
		};
		return text.replace(/[&<>"']/g, m => map[m]);
	}

	async saveToItem(item, archivedUrl, metadata = {}) {
		const originalUrl = item.getField("url");
		const linkText = item.getField("title") || originalUrl;

		let extra = item.getField("extra") || "";
		const archiveField = `${this.id}Archived: ${archivedUrl}`;
		if (!extra.includes(archiveField)) {
			extra = extra ? extra + "\n" + archiveField : archiveField;
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

	showProgressWindow(title, message) {
		const progressWindow = new Zotero.ProgressWindow({ closeOnClick: false });
		progressWindow.changeHeadline(title || this.getStatusLabel());
		if (message) {
			progressWindow.addDescription(message);
		}
		progressWindow.show();
		return progressWindow;
	}

	showError(error) {
		const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWindow.changeHeadline(`${this.name} Error`);
		progressWindow.addDescription(error.message || "An unknown error occurred");
		progressWindow.show();
		progressWindow.startCloseTimer(5000);
	}

	showSuccess(message) {
		const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWindow.changeHeadline(`${this.name} Success`);
		progressWindow.addDescription(message);
		progressWindow.show();
		progressWindow.startCloseTimer(3000);
	}
};