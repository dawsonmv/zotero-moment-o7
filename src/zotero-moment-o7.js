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
							const autoArchiveEnabled = Zotero.Prefs.get("extensions.momento7.autoArchive", true);

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
		const zoteroItemMenu = doc.getElementById("zotero-itemmenu");

		if (!zoteroItemMenu) {
			this.log("Item menu not found, will retry later");
			return;
		}

		// Create separator
		const separator = doc.createXULElement("menuseparator");
		separator.id = "zotero-moment-o7-separator";

		// Create main menu
		const menu = doc.createXULElement("menu");
		menu.id = "zotero-moment-o7-menu";
		menu.setAttribute("label", "Archive this Resource");

		// Create popup
		const menupopup = doc.createXULElement("menupopup");

		// Create Internet Archive menu item
		const iaMenuItem = doc.createXULElement("menuitem");
		iaMenuItem.id = "zotero-moment-o7-ia";
		iaMenuItem.setAttribute("label", "Internet Archive");

		// Add click handler
		iaMenuItem.addEventListener("command", async (_event) => {
			try {
				this.log("Internet Archive menu clicked");
				const items = window.ZoteroPane.getSelectedItems();
				if (!items || items.length === 0) {
					throw new Error("No items selected");
				}

				// Use the new service architecture
				const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(items, "internetarchive");

				// Show results to user
				const failures = results.filter(r => !r.success);
				if (failures.length === 0) {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Successfully archived ${results.length} item(s) to Internet Archive`);
					progressWin.show();
					progressWin.startCloseTimer(3000);
				} else if (failures.length === results.length) {
					// All failed
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline("Archive Error");
					progressWin.addDescription(failures[0].error || "Unknown error");
					progressWin.show();
					progressWin.startCloseTimer(8000);
				} else {
					// Some succeeded, some failed
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Archived ${results.length - failures.length} of ${results.length} items`);
					progressWin.addDescription(`${failures.length} items failed`);
					progressWin.show();
					progressWin.startCloseTimer(5000);
				}
			} catch (error) {
				this.log("Error archiving to Internet Archive: " + error);
				// Also show error to user
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline("Archive Error: " + error.message);
				progressWin.show();
				progressWin.startCloseTimer(8000);
			}
		});

		// Create Archive.today menu item
		const atMenuItem = doc.createXULElement("menuitem");
		atMenuItem.id = "zotero-moment-o7-archive-today";
		atMenuItem.setAttribute("label", "Archive.today");

		// Add click handler
		atMenuItem.addEventListener("command", async (_event) => {
			try {
				this.log("Archive.today menu clicked");
				const items = window.ZoteroPane.getSelectedItems();
				if (!items || items.length === 0) {
					throw new Error("No items selected");
				}

				// Use the new service architecture
				const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(items, "archivetoday");

				// Show results to user
				const failures = results.filter(r => !r.success);
				if (failures.length === 0) {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Successfully archived ${results.length} item(s) to Archive.today`);
					progressWin.show();
					progressWin.startCloseTimer(3000);
				} else if (failures.length === results.length) {
					// All failed
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline("Archive Error");
					progressWin.addDescription(failures[0].error || "Unknown error");
					progressWin.show();
					progressWin.startCloseTimer(8000);
				} else {
					// Some succeeded, some failed
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Archived ${results.length - failures.length} of ${results.length} items`);
					progressWin.addDescription(`${failures.length} items failed`);
					progressWin.show();
					progressWin.startCloseTimer(5000);
				}
			} catch (error) {
				this.log("Error archiving to Archive.today: " + error);
				// Also show error to user
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline("Archive Error: " + error.message);
				progressWin.show();
				progressWin.startCloseTimer(8000);
			}
		});

		// Create separator
		const menuSeparator = doc.createXULElement("menuseparator");
		menuSeparator.id = "zotero-moment-o7-menu-separator";

		// Create Robust Link menu item
		const robustMenuItem = doc.createXULElement("menuitem");
		robustMenuItem.id = "zotero-moment-o7-robust-link";
		robustMenuItem.setAttribute("label", "Create Robust Link (All Archives)");

		// Add click handler
		robustMenuItem.addEventListener("command", async (_event) => {
			try {
				this.log("Robust Link menu clicked");
				const items = window.ZoteroPane.getSelectedItems();
				if (!items || items.length === 0) {
					throw new Error("No items selected");
				}

				// Get robust link services from preferences
				const robustServices = Zotero.Prefs.get("extensions.momento7.robustLinkServices",
					"internetarchive,archivetoday").split(",");

				// Archive to selected services
				const allResults = [];
				for (const serviceId of robustServices) {
					try {
						const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(items, serviceId);
						allResults.push(...results);
					} catch (error) {
						this.log(`Error archiving to ${serviceId}: ${error}`);
					}
				}

				// Show results
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline(`Created robust links for ${items.length} item(s)`);
				progressWin.addDescription(`Archived to ${robustServices.length} services`);
				progressWin.show();
				progressWin.startCloseTimer(3000);
			} catch (error) {
				this.log("Error creating robust link: " + error);
				// Also show error to user
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline("Archive Error: " + error.message);
				progressWin.show();
				progressWin.startCloseTimer(8000);
			}
		});

		// Create Perma.cc menu item
		const permaccMenuItem = doc.createXULElement("menuitem");
		permaccMenuItem.id = "zotero-moment-o7-permacc";
		permaccMenuItem.setAttribute("label", "Perma.cc (Academic)");

		// Add click handler
		permaccMenuItem.addEventListener("command", async (_event) => {
			try {
				this.log("Perma.cc menu clicked");
				const items = window.ZoteroPane.getSelectedItems();
				if (!items || items.length === 0) {
					throw new Error("No items selected");
				}

				// Use the new service architecture
				const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(items, "permacc");

				// Show results to user
				const failures = results.filter(r => !r.success);
				if (failures.length === 0) {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Successfully archived ${results.length} item(s) to Perma.cc`);
					progressWin.show();
					progressWin.startCloseTimer(3000);
				} else if (failures.length === results.length) {
					// All failed
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline("Archive Error");
					progressWin.addDescription(failures[0].error || "Unknown error");
					progressWin.show();
					progressWin.startCloseTimer(8000);
				} else {
					// Some succeeded, some failed
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Archived ${results.length - failures.length} of ${results.length} items`);
					progressWin.addDescription(`${failures.length} items failed`);
					progressWin.show();
					progressWin.startCloseTimer(5000);
				}
			} catch (error) {
				this.log("Error archiving to Perma.cc: " + error);
				// Also show error to user
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline("Archive Error: " + error.message);
				progressWin.show();
				progressWin.startCloseTimer(8000);
			}
		});

		// Create UK Web Archive menu item
		const ukwebMenuItem = doc.createXULElement("menuitem");
		ukwebMenuItem.id = "zotero-moment-o7-ukwebarchive";
		ukwebMenuItem.setAttribute("label", "UK Web Archive");

		// Add click handler
		ukwebMenuItem.addEventListener("command", async (_event) => {
			try {
				this.log("UK Web Archive menu clicked");
				const items = window.ZoteroPane.getSelectedItems();
				if (!items || items.length === 0) {
					throw new Error("No items selected");
				}

				// Use the new service architecture
				const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(items, "ukwebarchive");

				// Show results to user
				const failures = results.filter(r => !r.success);
				if (failures.length === 0) {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Successfully nominated ${results.length} item(s) to UK Web Archive`);
					progressWin.show();
					progressWin.startCloseTimer(3000);
				} else {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline("Archive Error");
					progressWin.addDescription(failures[0].error || "Unknown error");
					progressWin.show();
					progressWin.startCloseTimer(8000);
				}
			} catch (error) {
				this.log("Error with UK Web Archive: " + error);
				// Also show error to user
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline("Archive Error: " + error.message);
				progressWin.show();
				progressWin.startCloseTimer(8000);
			}
		});

		// Create Arquivo.pt menu item
		const arquivoptMenuItem = doc.createXULElement("menuitem");
		arquivoptMenuItem.id = "zotero-moment-o7-arquivopt";
		arquivoptMenuItem.setAttribute("label", "Arquivo.pt (Portuguese)");

		// Add click handler
		arquivoptMenuItem.addEventListener("command", async (_event) => {
			try {
				this.log("Arquivo.pt menu clicked");
				const items = window.ZoteroPane.getSelectedItems();
				if (!items || items.length === 0) {
					throw new Error("No items selected");
				}

				// Use the new service architecture
				const results = await Zotero.MomentO7.ArchiveCoordinator.archiveItems(items, "arquivopt");

				// Show results to user
				const failures = results.filter(r => !r.success);
				if (failures.length === 0) {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline(`Successfully archived ${results.length} item(s) to Arquivo.pt`);
					progressWin.show();
					progressWin.startCloseTimer(3000);
				} else {
					const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
					progressWin.changeHeadline("Archive Error");
					progressWin.addDescription(failures[0].error || "Unknown error");
					progressWin.show();
					progressWin.startCloseTimer(8000);
				}
			} catch (error) {
				this.log("Error archiving to Arquivo.pt: " + error);
				// Also show error to user
				const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
				progressWin.changeHeadline("Archive Error: " + error.message);
				progressWin.show();
				progressWin.startCloseTimer(8000);
			}
		});

		// Create second separator for preferences
		const menuSeparator2 = doc.createXULElement("menuseparator");
		menuSeparator2.id = "zotero-moment-o7-menu-separator-2";

		// Create Preferences menu item
		const prefsMenuItem = doc.createXULElement("menuitem");
		prefsMenuItem.id = "zotero-moment-o7-preferences";
		prefsMenuItem.setAttribute("label", "Moment-o7 Preferences...");

		// Add click handler
		prefsMenuItem.addEventListener("command", async (_event) => {
			try {
				this.openPreferences();
			} catch (error) {
				this.log("Error opening preferences: " + error);
			}
		});

		// Assemble menu
		menupopup.appendChild(iaMenuItem);
		menupopup.appendChild(atMenuItem);
		menupopup.appendChild(permaccMenuItem);
		menupopup.appendChild(ukwebMenuItem);
		menupopup.appendChild(arquivoptMenuItem);
		menupopup.appendChild(menuSeparator);
		menupopup.appendChild(robustMenuItem);
		menupopup.appendChild(menuSeparator2);
		menupopup.appendChild(prefsMenuItem);
		menu.appendChild(menupopup);

		// Add to item menu
		zoteroItemMenu.appendChild(separator);
		zoteroItemMenu.appendChild(menu);

		// Store references for cleanup
		const windowData = this._windows.get(window);
		windowData.menuItems.push(separator, menu);

		this.storeAddedElement(separator);
		this.storeAddedElement(menu);
	},

	storeAddedElement(elem) {
		if (!elem.id) {
			throw new Error("Element must have an id");
		}
		this._addedElementIDs.push(elem.id);
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
			if (elem) {
				elem.remove();
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
		if (typeof Zotero.PreferencePanes !== 'undefined' && Zotero.PreferencePanes.register) {
			this.log("Using Zotero preference panes system");
			// Register our pane if not already registered
			if (!Zotero.PreferencePanes.pluginPanes?.find(p => p.id === 'momento7')) {
				this.log("Registering preference pane");
				Zotero.PreferencePanes.register({
					pluginID: 'momento7@github.com',
					src: this.rootURI + 'chrome/content/preferences.xhtml',
					label: 'Moment-o7',
					image: this.rootURI + 'icon48.png'
				});
			}
			// Open preferences to our pane
			this.log("Opening preferences window");
			Zotero.Utilities.Internal.openPreferences('momento7@github.com');
		} else {
			this.log("Falling back to inline preferences");
			// Fallback to simple dialog
			Zotero.MomentO7.Preferences.createInlinePreferences();
		}
	},

	getPreferencesHTML() {
		return `<?xml version="1.0"?>
<?xml-stylesheet href="chrome://global/skin/" type="text/css"?>
<?xml-stylesheet href="chrome://zotero-platform/content/preferences.css"?>
<window xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
	title="Moment-o7 Preferences"
	onload="initPreferences();">
	
	<script src="chrome://zotero/content/include.js"/>
	<script><![CDATA[
		function initPreferences() {
			Zotero.MomentO7.Preferences.createPreferencesWindow(window);
		}
	]]></script>
	
	<vbox id="momento7-preferences-container" flex="1" style="padding: 20px;">
		<!-- Content will be added dynamically -->
	</vbox>
</window>`;
	},

	shutdown() {
		this.log("Shutting down");

		// Unregister notifier
		this.unregisterNotifier();

		// Clear element ID list
		this._addedElementIDs = [];

		// Clear other properties
		this.initialized = false;
		this.id = null;
		this.version = null;
		this.rootURI = null;
	}
};