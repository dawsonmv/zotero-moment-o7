// Moment Creator for Zotero 7
// Creates moments (multi-archive snapshots) from multiple archive services

if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.MomentCreator = {
	/**
	 * Create moments for selected items using configured services
	 * @param {Array} items - Array of Zotero items
	 * @returns {Promise} Results of the archiving operations
	 */
	async createMoments(items) {
		if (!items || items.length === 0) {
			throw new Error("No items provided");
		}

		// Get enabled services from preferences
		// Use enabled services for robust links
		const robustServices = Zotero.Prefs.get("extensions.zotero.momento7.enabledServices",
			"internetarchive,archivetoday").split(",").filter(s => s);

		if (robustServices.length === 0) {
			throw new Error("No services enabled for moments");
		}

		const results = [];

		for (const item of items) {
			if (item.isNote() || item.isAttachment()) {
				continue;
			}

			const url = item.getField("url");
			if (!url) {
				continue;
			}

			const itemResult = {
				item: item,
				url: url,
				services: {},
				success: false
			};

			// Archive to each enabled service
			for (const serviceId of robustServices) {
				try {
					const service = Zotero.MomentO7.ServiceRegistry.get(serviceId);
					if (!service) {
						continue;
					}

					const archiveResult = await service.archive([item]);
					if (archiveResult && archiveResult[0] && archiveResult[0].archivedUrl) {
						itemResult.services[serviceId] = {
							success: true,
							url: archiveResult[0].archivedUrl
						};
						itemResult.success = true;
					}
				} catch (error) {
					itemResult.services[serviceId] = {
						success: false,
						error: error.message
					};
					Zotero.debug(`Robust link error for ${serviceId}: ${error}`);
				}
			}

			// Create moment note if we have at least one successful archive
			if (itemResult.success) {
				await this.createMomentNote(item, itemResult.services);
			}

			results.push(itemResult);
		}

		return results;
	},

	/**
	 * Create Moment note with all archive links
	 */
	async createMomentNote(item, serviceResults) {
		const originalUrl = item.getField("url");
		const title = item.getField("title") || originalUrl;

		// Find the best memento URL (prefer Internet Archive)
		let primaryMemento = null;
		let primaryService = null;

		if (serviceResults.internetarchive?.success) {
			primaryMemento = serviceResults.internetarchive.url;
			primaryService = "Internet Archive";
		} else if (serviceResults.archivetoday?.success) {
			primaryMemento = serviceResults.archivetoday.url;
			primaryService = "Archive.today";
		} else {
			// Use first successful service
			for (const [serviceId, result] of Object.entries(serviceResults)) {
				if (result.success) {
					primaryMemento = result.url;
					primaryService = this.getServiceName(serviceId);
					break;
				}
			}
		}

		if (!primaryMemento) {
			throw new Error("No successful archives to create moment");
		}

		const mementoDate = new Date().toISOString();

		// Create the moment HTML
		let noteContent = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;\">";

		// Header
		noteContent += `<h2 style="color: #2e4057; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Moment for "${title}"</h2>`;

		// Archive Status
		noteContent += "<div style=\"background-color: #f5f5f5; border-radius: 8px; padding: 15px; margin: 20px 0;\">";
		noteContent += "<h3 style=\"margin-top: 0; color: #333;\">Archive Status</h3>";
		noteContent += "<ul style=\"list-style: none; padding: 0;\">";

		for (const [serviceId, result] of Object.entries(serviceResults)) {
			if (result.success) {
				const serviceName = this.getServiceName(serviceId);
				const icon = "✓";
				noteContent += "<li style=\"margin: 8px 0;\">";
				noteContent += `<span style="color: #4CAF50; font-weight: bold; margin-right: 8px;">${icon}</span>`;
				noteContent += `<strong>${serviceName}:</strong> `;
				noteContent += `<a href="${result.url}" style="color: #1976D2;">${result.url}</a>`;
				noteContent += "</li>";
			}
		}

		noteContent += "</ul>";
		noteContent += "</div>";

		// Moment Implementation
		noteContent += "<div style=\"margin: 20px 0;\">";
		noteContent += "<h3 style=\"color: #333;\">How to Use This Moment</h3>";
		noteContent += "<p style=\"line-height: 1.6;\">A Moment includes both the original URL and archived versions to preserve this citation forever.</p>";
		noteContent += "</div>";

		// HTML Snippets
		noteContent += "<div style=\"background-color: #f9f9f9; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;\">";
		noteContent += "<h4 style=\"margin-top: 0; color: #1976D2;\">Step 1: Choose Your HTML Snippet</h4>";

		// Link to original
		const momentLinkOriginal = `<a href="${originalUrl}" data-originalurl="${originalUrl}" data-versionurl="${primaryMemento}" data-versiondate="${mementoDate}">${title}</a>`;
		noteContent += "<p><strong>Option A:</strong> Link to the live web page (with archived fallback):</p>";
		noteContent += `<pre style="background-color: #fff; border: 1px solid #ddd; padding: 10px; overflow-x: auto; font-size: 13px;"><code>${this.escapeHtml(momentLinkOriginal)}</code></pre>`;

		// Link to archive
		const momentLinkArchived = `<a href="${primaryMemento}" data-originalurl="${originalUrl}" data-versionurl="${primaryMemento}" data-versiondate="${mementoDate}">${title}</a>`;
		noteContent += "<p><strong>Option B:</strong> Link directly to the archived version:</p>";
		noteContent += `<pre style="background-color: #fff; border: 1px solid #ddd; padding: 10px; overflow-x: auto; font-size: 13px;"><code>${this.escapeHtml(momentLinkArchived)}</code></pre>`;
		noteContent += "</div>";

		// JavaScript/CSS includes
		noteContent += "<div style=\"background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;\">";
		noteContent += "<h4 style=\"margin-top: 0; color: #388E3C;\">Step 2: Include Moment Links JavaScript & CSS</h4>";
		noteContent += "<p>Add these lines to your webpage's <code>&lt;head&gt;</code> section:</p>";
		noteContent += "<pre style=\"background-color: #fff; border: 1px solid #ddd; padding: 10px; overflow-x: auto; font-size: 13px;\"><code>";
		noteContent += "&lt;!-- Moment Links CSS --&gt;\n";
		noteContent += "&lt;link rel=\"stylesheet\" type=\"text/css\" href=\"https://doi.org/10.25776/z58z-r575\" /&gt;\n";
		noteContent += "&lt;!-- Moment Links JavaScript --&gt;\n";
		noteContent += "&lt;script type=\"text/javascript\" src=\"https://doi.org/10.25776/h1fa-7a28\"&gt;&lt;/script&gt;";
		noteContent += "</code></pre>";
		noteContent += "</div>";

		// Metadata
		noteContent += "<div style=\"margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;\">";
		noteContent += `<p><strong>Original URL:</strong> ${originalUrl}</p>`;
		noteContent += `<p><strong>Primary Archive:</strong> ${primaryService}</p>`;
		noteContent += `<p><strong>Archive Date:</strong> ${new Date().toLocaleString()}</p>`;
		noteContent += "</div>";

		noteContent += "</div>";

		// Create note
		await item.addNote(noteContent);

		// Add tags
		item.addTag("moment");
		if (!item.hasTag("archived")) {
			item.addTag("archived");
		}
		await item.saveTx();
	},

	/**
	 * Get friendly service name
	 */
	getServiceName(serviceId) {
		const names = {
			internetarchive: "Internet Archive",
			archivetoday: "Archive.today",
			permacc: "Perma.cc",
			ukwebarchive: "UK Web Archive",
			arquivopt: "Arquivo.pt"
		};
		return names[serviceId] || serviceId;
	},

	/**
	 * Escape HTML for display
	 */
	escapeHtml(html) {
		return html
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	},

	/**
	 * Check if item has Moment note
	 */
	hasMoment(item) {
		const notes = item.getNotes(true);
		for (const note of notes) {
			const content = note.getNote();
			if (content.includes("Moment for") || content.includes("data-versionurl")) {
				return true;
			}
		}
		return false;
	}
};