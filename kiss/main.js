/**
 * Zotero Moment-o7 - Simple KISS Implementation
 * Archives web resources to prevent link rot
 */

"use strict";

/* global Zotero */

Zotero.MomentO7 = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,

	// Simple preference defaults
	prefs: {
		autoArchive: true,
		autoArchiveDelay: 3000,
		enabledServices: ["internetarchive", "archivetoday"],
		createNote: true
	},

	// Initialize plugin
	init({ id, version, rootURI }) {
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;

		// Load preferences
		this.loadPreferences();

		// Register auto-archive observer
		if (this.prefs.autoArchive) {
			Zotero.Notifier.register(this, ["item"], "momento7");
		}

		this.initialized = true;
		Zotero.debug(`MomentO7: Initialized version ${version}`);
	},

	// Load preferences from Zotero prefs
	loadPreferences() {
		const prefKeys = Object.keys(this.prefs);
		for (const key of prefKeys) {
			const value = Zotero.Prefs.get(`extensions.zotero.momento7.${key}`);
			if (value !== undefined) {
				this.prefs[key] = value;
			}
		}
	},

	// Handle new items for auto-archiving
	notify(event, type, ids) {
		if (event === "add" && type === "item" && this.prefs.autoArchive) {
			Zotero.setTimeout(() => {
				this.autoArchiveItems(ids);
			}, this.prefs.autoArchiveDelay);
		}
	},

	// Auto-archive new items
	async autoArchiveItems(ids) {
		for (const id of ids) {
			try {
				const item = await Zotero.Items.getAsync(id);
				if (item && item.getField("url") && !item.parentID) {
					await this.archiveItem(item, "internetarchive");
				}
			} catch (e) {
				Zotero.debug(`MomentO7: Auto-archive error: ${e}`);
			}
		}
	},

	// Add menu items to Zotero UI
	addToWindow(window) {
		const doc = window.document;
		const menuitem = doc.getElementById("zotero-itemmenu");

		if (!menuitem) {
			return;
		}

		// Add separator
		const separator = doc.createXULElement("menuseparator");
		separator.id = "momento7-separator";
		menuitem.appendChild(separator);

		// Add simple archive menu items
		const menuItems = [
			{ id: "internetarchive", label: "Archive to Internet Archive" },
			{ id: "archivetoday", label: "Archive to Archive.today" },
			{ id: "robust", label: "Create Robust Link" }
		];

		menuItems.forEach(item => {
			const menuItem = doc.createXULElement("menuitem");
			menuItem.id = `momento7-${item.id}`;
			menuItem.setAttribute("label", item.label);
			menuItem.addEventListener("command", () => this.handleMenuClick(window, item.id));
			menuitem.appendChild(menuItem);
		});
	},

	// Handle menu clicks
	async handleMenuClick(window, service) {
		const items = window.ZoteroPane.getSelectedItems();
		const itemsWithUrls = items.filter(item => item.getField("url"));

		if (itemsWithUrls.length === 0) {
			this.showMessage("No items with URLs selected", "warning");
			return;
		}

		if (service === "robust") {
			await this.createRobustLinks(itemsWithUrls);
		} else {
			await this.archiveItems(itemsWithUrls, service);
		}
	},

	// Archive multiple items
	async archiveItems(items, service) {
		const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
		progressWin.changeHeadline(`Archiving to ${service}...`);
		progressWin.show();

		let success = 0;
		let failed = 0;

		for (const item of items) {
			try {
				await this.archiveItem(item, service);
				success++;
			} catch (e) {
				failed++;
				Zotero.debug(`MomentO7: Archive failed: ${e}`);
			}
		}

		progressWin.close();

		if (failed === 0) {
			this.showMessage(`Archived ${success} item(s)`);
		} else {
			this.showMessage(`Archived ${success} item(s), ${failed} failed`, "warning");
		}
	},

	// Archive a single item
	async archiveItem(item, service) {
		const url = item.getField("url");
		if (!url) {
			throw new Error("No URL");
		}

		const archiveUrl = await this.archive(url, service);

		// Store archive URL in item
		const extra = item.getField("extra") || "";
		const archiveField = `Archive ${service}: ${archiveUrl}`;

		if (!extra.includes(archiveField)) {
			item.setField("extra", extra ? `${extra}\n${archiveField}` : archiveField);
			await item.saveTx();
		}

		// Create note if enabled
		if (this.prefs.createNote) {
			await this.createArchiveNote(item, service, archiveUrl);
		}

		return archiveUrl;
	},

	// Simple archive function
	async archive(url, service) {
		if (service === "internetarchive") {
			return await this.archiveToIA(url);
		} else if (service === "archivetoday") {
			return await this.archiveToAT(url);
		}
		throw new Error(`Unknown service: ${service}`);
	},

	// Archive to Internet Archive
	async archiveToIA(url) {
		const saveUrl = `https://web.archive.org/save/${url}`;

		const response = await Zotero.HTTP.request("GET", saveUrl, {
			timeout: 30000,
			responseType: "text"
		});

		// Extract archived URL from response headers or content
		const locationHeader = response.getResponseHeader("Content-Location");
		if (locationHeader && locationHeader.includes("/web/")) {
			return `https://web.archive.org${locationHeader}`;
		}

		// Fallback: construct URL
		const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
		return `https://web.archive.org/web/${timestamp}/${url}`;
	},

	// Archive to Archive.today
	async archiveToAT(url) {
		// Use Cloudflare Worker proxy
		const proxyUrl = "https://archive-proxy.YOUR-WORKER.workers.dev/archive";

		const response = await Zotero.HTTP.request("POST", proxyUrl, {
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url }),
			timeout: 30000
		});

		const data = JSON.parse(response.response);
		if (data.archived_url) {
			return data.archived_url;
		}

		throw new Error(data.error || "Archive failed");
	},

	// Create robust links
	async createRobustLinks(items) {
		const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
		progressWin.changeHeadline("Creating Robust Links...");
		progressWin.show();

		for (const item of items) {
			try {
				const url = item.getField("url");
				if (!url) {
					continue;
				}

				// Archive to both services
				const archives = {};
				for (const service of this.prefs.enabledServices) {
					try {
						archives[service] = await this.archive(url, service);
					} catch (e) {
						Zotero.debug(`MomentO7: ${service} failed: ${e}`);
					}
				}

				// Create robust link HTML
				const html = this.createRobustLinkHTML(url, archives);

				// Create note
				const note = new Zotero.Item("note");
				note.parentID = item.id;
				note.setNote(html);
				await note.saveTx();

			} catch (e) {
				Zotero.debug(`MomentO7: Robust link failed: ${e}`);
			}
		}

		progressWin.close();
		this.showMessage("Robust links created");
	},

	// Create simple robust link HTML
	createRobustLinkHTML(originalUrl, archives) {
		const date = new Date().toISOString();
		let html = "<h2>Robust Link</h2>";
		html += `<p>Original: <a href="${originalUrl}">${originalUrl}</a></p>`;
		html += `<p>Archived on ${date}:</p><ul>`;

		for (const [service, url] of Object.entries(archives)) {
			html += `<li>${service}: <a href="${url}">${url}</a></li>`;
		}

		html += "</ul>";
		return html;
	},

	// Create archive note
	async createArchiveNote(item, service, archiveUrl) {
		const note = new Zotero.Item("note");
		note.parentID = item.id;
		note.setNote(`<p>Archived to ${service}: <a href="${archiveUrl}">${archiveUrl}</a></p>`);
		await note.saveTx();
	},

	// Show simple messages
	showMessage(text, type = "success") {
		const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWin.changeHeadline(type === "success" ? "✓" : "⚠");
		progressWin.addDescription(text);
		progressWin.show();
		progressWin.startCloseTimer(3000);
	},

	// Cleanup
	shutdown() {
		Zotero.Notifier.unregister(this.notifierID);
		this.initialized = false;
	}
};