/**
 * Unified Main Plugin Logic - KISS principles with full functionality
 */

Zotero.MomentO7 = Zotero.MomentO7 || {};

/**
 * Main plugin controller
 */
Zotero.MomentO7.Main = {
	/**
	 * Initialize plugin
	 */
	async init() {
		// Load configuration
		await this.loadConfig();
		
		// Register observer for new items
		this.registerObserver();
		
		// Initialize UI in all windows
		const windows = Zotero.getMainWindows();
		for (const win of windows) {
			if (win.ZoteroPane) {
				await this.addToWindow(win);
			}
		}
	},
	
	/**
	 * Load configuration
	 */
	async loadConfig() {
		try {
			// Try to load external config
			const configPath = OS.Path.join(Zotero.DataDirectory.dir, "momento7-config.js");
			if (await IOUtils.exists(configPath)) {
				const configContent = await IOUtils.readUTF8(configPath);
				// Simple eval for config object (safe in extension context)
				eval(configContent);
			}
		} catch (e) {
			Zotero.debug(`[Moment-o7] No external config found: ${e.message}`);
		}
	},
	
	/**
	 * Add UI elements to window
	 */
	async addToWindow(window) {
		const doc = window.document;
		
		// Add to item menu
		const itemMenu = doc.getElementById("zotero-itemmenu");
		if (itemMenu) {
			// Add separator
			const sep = doc.createXULElement("menuseparator");
			sep.setAttribute("id", "momento7-separator");
			itemMenu.appendChild(sep);
			
			// Add menu item
			const menuItem = doc.createXULElement("menuitem");
			menuItem.setAttribute("id", "momento7-archive");
			menuItem.setAttribute("label", "Archive to...");
			menuItem.addEventListener("command", () => this.handleMenuCommand(window));
			itemMenu.appendChild(menuItem);
			
			// Update menu on popup
			itemMenu.addEventListener("popupshowing", () => this.updateMenu(window));
		}
	},
	
	/**
	 * Update menu based on selection and enabled services
	 */
	updateMenu(window) {
		const items = window.ZoteroPane.getSelectedItems();
		const menuItem = window.document.getElementById("momento7-archive");
		
		if (!menuItem) return;
		
		// Check if any items have URLs
		const hasUrls = items.some(item => item.getField("url"));
		menuItem.disabled = !hasUrls;
		
		// Update label based on enabled services
		const enabledServices = Zotero.MomentO7.ServiceHelpers.getEnabledServices();
		if (enabledServices.length === 0) {
			menuItem.label = "Archive to... (no services enabled)";
			menuItem.disabled = true;
		} else if (enabledServices.length === 1) {
			menuItem.label = `Archive to ${enabledServices[0].name}`;
		} else {
			menuItem.label = `Archive to... (${enabledServices.length} services)`;
		}
	},
	
	/**
	 * Handle menu command
	 */
	async handleMenuCommand(window) {
		const items = window.ZoteroPane.getSelectedItems();
		const itemsWithUrls = items.filter(item => item.getField("url"));
		
		if (itemsWithUrls.length === 0) {
			this.showMessage(window, "No items with URLs selected", "warning");
			return;
		}
		
		// Archive items
		await this.archiveItems(window, itemsWithUrls);
	},
	
	/**
	 * Archive multiple items
	 */
	async archiveItems(window, items) {
		const enabledServices = Zotero.MomentO7.ServiceHelpers.getEnabledServices();
		
		if (enabledServices.length === 0) {
			this.showMessage(window, "No archive services enabled", "error");
			return;
		}
		
		// Show progress
		const progressWin = new window.Zotero.ProgressWindow({ closeOnClick: false });
		progressWin.changeHeadline("Archiving items...");
		progressWin.show();
		
		let successCount = 0;
		let errorCount = 0;
		
		for (const item of items) {
			const url = item.getField("url");
			const itemProgress = progressWin.addLines(`Archiving: ${item.getField("title")}`, 
			                                         Zotero.ProgressWindow.ICON_ARROW_RIGHT);
			
			try {
				const results = await Zotero.MomentO7.ServiceHelpers.archiveWithAllServices(url);
				
				// Store results in item
				await this.storeArchiveResults(item, results);
				
				// Update progress
				const successServices = results.filter(r => r.success).length;
				const totalServices = results.length;
				
				if (successServices === totalServices) {
					itemProgress.setText(`✓ Archived to ${successServices} service(s)`);
					successCount++;
				} else if (successServices > 0) {
					itemProgress.setText(`⚠ Archived to ${successServices}/${totalServices} service(s)`);
					successCount++;
				} else {
					itemProgress.setText(`✗ Failed to archive`);
					errorCount++;
				}
			} catch (error) {
				itemProgress.setText(`✗ Error: ${error.message}`);
				errorCount++;
			}
		}
		
		// Final message
		progressWin.changeHeadline(`Archive complete: ${successCount} succeeded, ${errorCount} failed`);
		progressWin.startCloseTimer(5000);
	},
	
	/**
	 * Store archive results in item
	 */
	async storeArchiveResults(item, results) {
		const extra = item.getField("extra") || "";
		const lines = extra.split("\n");
		
		// Add archive URLs to extra field
		for (const result of results) {
			if (result.success && !result.skipped) {
				const service = Zotero.MomentO7.Services[result.service] || 
				               Object.values(Zotero.MomentO7.Services).find(s => s.id === result.service);
				const line = `Archive ${service.name}: ${result.archived_url}`;
				
				if (!lines.includes(line)) {
					lines.push(line);
				}
			}
		}
		
		// Update extra field
		item.setField("extra", lines.join("\n"));
		await item.saveTx();
		
		// Create moment note if enabled
		if (Zotero.Prefs.get("extensions.momento7.createNotes") !== false) {
			await this.createMomentNote(item, results);
		}
	},
	
	/**
	 * Create moment note with archive links
	 */
	async createMomentNote(item, results) {
		const successfulArchives = results.filter(r => r.success && !r.skipped);
		if (successfulArchives.length === 0) return;
		
		const date = new Date().toLocaleDateString();
		const originalUrl = item.getField("url");
		
		// Build HTML content
		let html = `<h3>Moment created on ${date}</h3>\n`;
		html += `<p>Original URL: <a href="${originalUrl}">${originalUrl}</a></p>\n`;
		html += `<p>Archived versions:</p>\n<ul>\n`;
		
		for (const result of successfulArchives) {
			const service = Zotero.MomentO7.Services[result.service] || 
			               Object.values(Zotero.MomentO7.Services).find(s => s.id === result.service);
			html += `  <li><a href="${result.archived_url}">${service.name}</a></li>\n`;
		}
		
		html += `</ul>\n`;
		
		// Add robust link data attributes
		html += `<div data-originalurl="${originalUrl}" `;
		html += `data-versionurl="${successfulArchives[0].archived_url}" `;
		html += `data-versiondate="${new Date().toISOString()}" `;
		html += `style="display:none;">Moment metadata</div>`;
		
		// Create note
		const note = new Zotero.Item("note");
		note.parentID = item.id;
		note.setNote(html);
		note.addTag("moment");
		await note.saveTx();
	},
	
	/**
	 * Register observer for auto-archive
	 */
	registerObserver() {
		const observerID = Zotero.Notifier.registerObserver({
			notify: async (event, type, ids, extraData) => {
				if (type !== "item" || event !== "add") return;
				if (!Zotero.Prefs.get("extensions.momento7.autoArchive")) return;
				
				// Get delay setting
				const delay = Zotero.Prefs.get("extensions.momento7.autoArchiveDelay") || 5;
				
				// Schedule archiving
				setTimeout(async () => {
					for (const id of ids) {
						try {
							const item = await Zotero.Items.getAsync(id);
							if (item && !item.isNote() && !item.isAttachment() && item.getField("url")) {
								const results = await Zotero.MomentO7.ServiceHelpers.archiveWithAllServices(
									item.getField("url")
								);
								await this.storeArchiveResults(item, results);
							}
						} catch (error) {
							Zotero.debug(`[Moment-o7] Auto-archive failed: ${error.message}`);
						}
					}
				}, delay * 1000);
			}
		}, ["item"]);
		
		// Store observer ID for cleanup
		this._observerID = observerID;
	},
	
	/**
	 * Show message to user
	 */
	showMessage(window, message, type = "info") {
		const progressWin = new window.Zotero.ProgressWindow({ closeOnClick: true });
		
		const headlines = {
			info: "Information",
			warning: "Warning", 
			error: "Error",
			success: "Success"
		};
		
		progressWin.changeHeadline(headlines[type] || "Message");
		progressWin.addDescription(message);
		progressWin.show();
		progressWin.startCloseTimer(type === "error" ? 5000 : 3000);
	},
	
	/**
	 * Shutdown - clean up
	 */
	shutdown() {
		if (this._observerID) {
			Zotero.Notifier.unregisterObserver(this._observerID);
		}
		
		// Remove UI elements from all windows
		const windows = Zotero.getMainWindows();
		for (const win of windows) {
			const doc = win.document;
			const elements = ["momento7-separator", "momento7-archive"];
			for (const id of elements) {
				const elem = doc.getElementById(id);
				if (elem) elem.remove();
			}
		}
	}
};