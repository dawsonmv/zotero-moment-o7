"use strict";

/**
 * Zotero Moment-o7 Plugin
 * Archives web resources to prevent link rot
 * @namespace
 */
Zotero.MomentO7 = {
	id: null,
	version: null,
	rootURI: null,
	_initialized: false,
	_addedElementIDs: [],
	_windows: new WeakMap(),
	_notifierID: null,

	/**
	 * Initialize the plugin
	 * @param {Object} params - Initialization parameters
	 * @param {string} params.id - Plugin ID
	 * @param {string} params.version - Plugin version
	 * @param {string} params.rootURI - Plugin root URI
	 */
	init({ id, version, rootURI }) {
		if (this._initialized) {
			return;
		}

		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this._initialized = true;

		this.log("Initializing Zotero Moment-o7 v" + version);

		// Initialize namespace for new architecture
		if (!Zotero.MomentO7) {
			Zotero.MomentO7 = this;
		}

		// Load new architecture modules
		Services.scriptloader.loadSubScript(rootURI + "src/BaseArchiveService.js");
		Services.scriptloader.loadSubScript(rootURI + "src/ServiceRegistry.js");
		Services.scriptloader.loadSubScript(rootURI + "src/ArchiveCoordinator.js");
		Services.scriptloader.loadSubScript(rootURI + "src/MementoChecker.js");
		Services.scriptloader.loadSubScript(rootURI + "src/Preferences.js");

		// Load services
		Services.scriptloader.loadSubScript(rootURI + "src/InternetArchiveService.js");
		Services.scriptloader.loadSubScript(rootURI + "src/ArchiveTodayService.js");
		Services.scriptloader.loadSubScript(rootURI + "src/PermaCCService.js");
		Services.scriptloader.loadSubScript(rootURI + "src/UKWebArchiveService.js");
		Services.scriptloader.loadSubScript(rootURI + "src/ArquivoPtService.js");

		// Load legacy modules (to be refactored)
		Services.scriptloader.loadSubScript(rootURI + "src/Signpost.js");
		Services.scriptloader.loadSubScript(rootURI + "src/IaPusher.js");
		Services.scriptloader.loadSubScript(rootURI + "src/ArchiveTodayPusher.js");
		Services.scriptloader.loadSubScript(rootURI + "src/RobustLinkCreator.js");

		// Initialize preferences
		Zotero.MomentO7.Preferences.init();

		// Initialize new architecture
		this.initializeServices();

		// Register notifier to watch for new items
		this.registerNotifier();
	},

	/**
	 * Log a message with the plugin prefix
	 * @param {string} msg - Message to log
	 */
	log(msg) {
		Zotero.debug("Zotero Moment-o7: " + msg);
	},

	async main() {
		this.log("Main initialization complete");
	},

	initializeServices() {
		// Initialize core components
		Zotero.MomentO7.ServiceRegistry.init();
		Zotero.MomentO7.ArchiveCoordinator.init();

		// Register services
		const iaService = new Zotero.MomentO7.InternetArchiveService();
		Zotero.MomentO7.ServiceRegistry.register("internetarchive", iaService);

		const atService = new Zotero.MomentO7.ArchiveTodayService();
		Zotero.MomentO7.ServiceRegistry.register("archivetoday", atService);

		const permaccService = new Zotero.MomentO7.PermaCCService();
		Zotero.MomentO7.ServiceRegistry.register("permacc", permaccService);

		const ukWebArchiveService = new Zotero.MomentO7.UKWebArchiveService();
		Zotero.MomentO7.ServiceRegistry.register("ukwebarchive", ukWebArchiveService);

		const arquivoPtService = new Zotero.MomentO7.ArquivoPtService();
		Zotero.MomentO7.ServiceRegistry.register("arquivopt", arquivoPtService);

		this.log("Services initialized and registered");
	},

	registerNotifier() {
		// Register notifier to watch for new items being added
		const notifierCallbacks = {
			notify: async (event, type, ids, _extraData) => {
				if (type === "item" && event === "add") {
					this.log("New items added: " + ids.join(", "));

					for (const id of ids) {
						try {
							const item = await Zotero.Items.getAsync(id);

							// Check if auto-archive is enabled
							const autoArchiveEnabled = Zotero.Prefs.get("extensions.zotero.momento7.autoArchive", true);

							// Only process web pages and other items with URLs
							if (autoArchiveEnabled && item && item.getField("url")) {
								this.log("Auto-archiving item: " + item.getField("title"));

								// Use new architecture for auto-archiving
								await Zotero.MomentO7.ArchiveCoordinator.autoArchive(item);
							}
						} catch (error) {
							this.log("Error processing item " + id + ": " + error);
						}
					}
				}
			}
		};

		this._notifierID = Zotero.Notifier.registerObserver(notifierCallbacks, ["item"]);
		this.log("Notifier registered with ID: " + this._notifierID);
	},

	unregisterNotifier() {
		if (this._notifierID) {
			Zotero.Notifier.unregisterObserver(this._notifierID);
			this.log("Notifier unregistered");
			this._notifierID = null;
		}
	},

	/**
	 * Add plugin UI elements to a Zotero window
	 * @param {Window} window - The Zotero window
	 */
	addToWindow(window) {
		if (!window || !window.document) {
			return;
		}

		this.log("Adding to window");

		// Store window-specific data
		this._windows.set(window, {
			menuItems: [],
			listeners: []
		});

		// Add menu items
		this.addMenuItems(window);

		// Add Fluent localization if we have locale files
		try {
			window.MozXULElement.insertFTLIfNeeded("moment-o7.ftl");
		} catch {
			// Fluent files not yet created, will add later
			this.log("Fluent localization not yet available");
		}
	},

	addMenuItems(window) {
		const doc = window.document;

		// Wait for the item menu to be available
		const itemMenu = doc.getElementById("zotero-itemmenu");
		if (!itemMenu) {
			this.log("Item menu not found");
			return;
		}

		// Create a simple separator
		const separator = doc.createXULElement("menuseparator");
		separator.id = "zotero-momento7-separator";

		// Get enabled services from preferences
		const enabledServicesStr = Zotero.Prefs.get("extensions.zotero.momento7.enabledServices") || "internetarchive,archivetoday";
		const enabledServices = enabledServicesStr.split(",").filter(s => s);

		// Create menu items for enabled services
		const menuItems = [];

		const serviceInfo = {
			internetarchive: { label: "Archive to Internet Archive", icon: "IA" },
			archivetoday: { label: "Archive to Archive.today", icon: "AT" },
			permacc: { label: "Archive to Perma.cc", icon: "PC" },
			ukwebarchive: { label: "Archive to UK Web Archive", icon: "UK" },
			arquivopt: { label: "Archive to Arquivo.pt", icon: "PT" }
		};

		// Add menu items for each enabled service
		enabledServices.forEach(service => {
			if (serviceInfo[service]) {
				// Check if service is registered
				const serviceInstance = Zotero.MomentO7.ServiceRegistry.get(service);
				if (serviceInstance) {
					menuItems.push({
						id: `zotero-momento7-archive-${service}`,
						label: serviceInfo[service].label,
						service: service
					});
				}
			}
		});

		// Add robust link option if any services are enabled for robust links
		const robustLinkServicesStr = Zotero.Prefs.get("extensions.zotero.momento7.robustLinkServices") || "internetarchive,archivetoday";
		const robustLinkServices = robustLinkServicesStr.split(",").filter(s => s);
		if (robustLinkServices.length > 0) {
			menuItems.push({
				id: "zotero-momento7-archive-robust",
				label: "Create Robust Link",
				service: "robust"
			});
		}

		// Add separator first
		itemMenu.appendChild(separator);
		this._addedElementIDs.push(separator.id);

		// Create menu items
		menuItems.forEach(itemConfig => {
			const menuItem = doc.createXULElement("menuitem");
			menuItem.id = itemConfig.id;
			menuItem.setAttribute("label", itemConfig.label);

			// Add command handler
			menuItem.addEventListener("command", async (event) => {
				event.stopPropagation();
				await this.handleMenuCommand(window, itemConfig.service);
			});

			itemMenu.appendChild(menuItem);
			this._addedElementIDs.push(menuItem.id);
		});

	},

	async handleMenuCommand(window, service) {
		try {
			const items = window.ZoteroPane.getSelectedItems();
			if (!items || items.length === 0) {
				this.showError("No items selected");
				return;
			}

			// Filter items that have URLs
			const itemsWithUrls = items.filter(item => item.getField("url"));
			if (itemsWithUrls.length === 0) {
				this.showError("Selected items have no URLs to archive");
				return;
			}

			if (service === "robust") {
				// Handle robust link creation
				await this.createRobustLinks(itemsWithUrls);
			} else {
				// Handle single service archiving
				const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(itemsWithUrls, service);
				this.showArchiveResults(results, service);
			}
		} catch (error) {
			this.log("Error in menu command: " + error);
			this.showError(error.message || "Archive operation failed");
		}
	},

	async createRobustLinks(items) {
		try {
			const progressWin = new Zotero.ProgressWindow({ closeOnClick: false });
			progressWin.changeHeadline("Creating Robust Links");
			progressWin.addDescription("Archiving to multiple services...");
			progressWin.show();

			// Use the RobustLinkCreator
			const results = await Zotero.MomentO7.RobustLinkCreator.createRobustLinks(items);

			progressWin.close();

			// Count successes and failures
			const successful = results.filter(r => r.success).length;
			const failed = results.length - successful;

			if (failed === 0) {
				this.showSuccess(`Created robust links for ${successful} item(s)`);
			} else if (successful === 0) {
				this.showError("Failed to create any robust links");
			} else {
				this.showWarning(`Robust links: ${successful} succeeded, ${failed} failed`);
			}
		} catch (error) {
			this.log("Error creating robust links: " + error);
			this.showError(error.message || "Failed to create robust links");
		}
	},

	showArchiveResults(results, service) {
		const successes = results.filter(r => r.success);
		const failures = results.filter(r => !r.success);

		if (failures.length === 0) {
			this.showSuccess(`Archived ${successes.length} item(s) to ${this.getServiceName(service)}`);
		} else if (successes.length === 0) {
			this.showError(`Failed to archive to ${this.getServiceName(service)}: ${failures[0].error || "Unknown error"}`);
		} else {
			this.showWarning(`${this.getServiceName(service)}: ${successes.length} succeeded, ${failures.length} failed`);
		}
	},

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

	showSuccess(message) {
		const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWin.changeHeadline("Success");
		progressWin.addDescription(message);
		progressWin.show();
		progressWin.startCloseTimer(3000);
	},

	showError(message) {
		const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWin.changeHeadline("Error");
		progressWin.addDescription(message);
		progressWin.show();
		progressWin.startCloseTimer(5000);
	},

	showWarning(message) {
		const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
		progressWin.changeHeadline("Warning");
		progressWin.addDescription(message);
		progressWin.show();
		progressWin.startCloseTimer(4000);
	},

	/**
	 * Remove plugin UI elements from a Zotero window
	 * @param {Window} window - The Zotero window
	 */
	removeFromWindow(window) {
		if (!window || !window.document) {
			return;
		}

		const doc = window.document;
		this.log("Removing from window");

		// Remove all elements added to DOM
		for (const id of this._addedElementIDs) {
			const elem = doc.getElementById(id);
			if (elem && elem.parentNode) {
				elem.parentNode.removeChild(elem);
			}
		}

		// Remove Fluent link if it exists
		const fluentLink = doc.querySelector("[href=\"moment-o7.ftl\"]");
		if (fluentLink) {
			fluentLink.remove();
		}

		// Clear window data
		this._windows.delete(window);
	},

	addToAllWindows() {
		const windows = Zotero.getMainWindows();
		for (const win of windows) {
			if (!win.ZoteroPane) {
				continue;
			}
			this.addToWindow(win);
		}
	},

	removeFromAllWindows() {
		const windows = Zotero.getMainWindows();
		for (const win of windows) {
			if (!win.ZoteroPane) {
				continue;
			}
			this.removeFromWindow(win);
		}
	},

	/**
	 * Open the preferences dialog
	 */
	openPreferences() {
		this.log("Opening preferences...");
		// Open Zotero's preferences window to our pane
		if (typeof Zotero.PreferencePanes !== "undefined" && Zotero.PreferencePanes.register) {
			this.log("Using Zotero preference panes system");
			// Register our pane if not already registered
			if (!Zotero.PreferencePanes.pluginPanes?.find(p => p.id === "momento7")) {
				this.log("Registering preference pane");
				Zotero.PreferencePanes.register({
					pluginID: "zotero-moment-o7@github.com",
					src: this.rootURI + "addon/content/preferences.xhtml",
					label: "Moment-o7",
					image: this.rootURI + "icon48.png"
				});
			}
			// Open preferences to our pane
			this.log("Opening preferences window");
			Zotero.Utilities.Internal.openPreferences("zotero-moment-o7@github.com");
		} else {
			this.log("Falling back to inline preferences");
			// Fallback to simple dialog
			Zotero.MomentO7.Preferences.createInlinePreferences();
		}
	},

	shutdown() {
		this.log("Shutting down");

		// Unregister notifier
		this.unregisterNotifier();

		// Clear element ID list
		this._addedElementIDs = [];

		// Clear other properties
		this._initialized = false;
		this.id = null;
		this.version = null;
		this.rootURI = null;
	}
};