// Main plugin object
Zotero.MomentO7 = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],
	windows: new WeakMap(),
	notifierID: null,

	init({ id, version, rootURI }) {
		if (this.initialized) {
			return;
		}

		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;

		this.log("Initializing Zotero Moment-o7 v" + version);

		// Load other modules
		Services.scriptloader.loadSubScript(rootURI + "src/Signpost.js");
		Services.scriptloader.loadSubScript(rootURI + "src/IaPusher.js");
		Services.scriptloader.loadSubScript(rootURI + "src/ArchiveTodayPusher.js");
		Services.scriptloader.loadSubScript(rootURI + "src/RobustLinkCreator.js");
		
		// Future services (uncomment to enable)
		// Services.scriptloader.loadSubScript(rootURI + "src/PermaCCPusher.js");
		// Services.scriptloader.loadSubScript(rootURI + "src/MementoChecker.js");

		// Register notifier to watch for new items
		this.registerNotifier();
	},

	log(msg) {
		Zotero.debug("Zotero Moment-o7: " + msg);
	},

	async main() {
		this.log("Main initialization complete");
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

							// Only process web pages and other items with URLs
							if (item && item.getField("url") && !Zotero.IaPusher.isArchived(item)) {
								this.log("Archiving item: " + item.getField("title"));

								// Archive the item
								await Zotero.IaPusher.archiveItem(item);
							}
						} catch (error) {
							this.log("Error processing item " + id + ": " + error);
						}
					}
				}
			}
		};

		this.notifierID = Zotero.Notifier.registerObserver(notifierCallbacks, ["item"]);
		this.log("Notifier registered with ID: " + this.notifierID);
	},

	unregisterNotifier() {
		if (this.notifierID) {
			Zotero.Notifier.unregisterObserver(this.notifierID);
			this.log("Notifier unregistered");
			this.notifierID = null;
		}
	},

	addToWindow(window) {
		if (!window || !window.document) {
			return;
		}

		this.log("Adding to window");

		// Store window-specific data
		this.windows.set(window, {
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
				await Zotero.IaPusher.sendReq();
			} catch (error) {
				this.log("Error archiving to Internet Archive: " + error);
			}
		});

		// Create Archive.today menu item
		const atMenuItem = doc.createXULElement("menuitem");
		atMenuItem.id = "zotero-moment-o7-archive-today";
		atMenuItem.setAttribute("label", "Archive.today");

		// Add click handler
		atMenuItem.addEventListener("command", async (_event) => {
			try {
				await Zotero.ArchiveTodayPusher.archiveSelected();
			} catch (error) {
				this.log("Error archiving to Archive.today: " + error);
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
				await Zotero.RobustLinkCreator.archiveToAll();
			} catch (error) {
				this.log("Error creating robust link: " + error);
			}
		});

		// Assemble menu
		menupopup.appendChild(iaMenuItem);
		menupopup.appendChild(atMenuItem);
		menupopup.appendChild(menuSeparator);
		menupopup.appendChild(robustMenuItem);
		menu.appendChild(menupopup);

		// Add to item menu
		zoteroItemMenu.appendChild(separator);
		zoteroItemMenu.appendChild(menu);

		// Store references for cleanup
		const windowData = this.windows.get(window);
		windowData.menuItems.push(separator, menu);

		this.storeAddedElement(separator);
		this.storeAddedElement(menu);
	},

	storeAddedElement(elem) {
		if (!elem.id) {
			throw new Error("Element must have an id");
		}
		this.addedElementIDs.push(elem.id);
	},

	removeFromWindow(window) {
		if (!window || !window.document) {
			return;
		}

		const doc = window.document;
		this.log("Removing from window");

		// Remove all elements added to DOM
		for (const id of this.addedElementIDs) {
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
		this.windows.delete(window);
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

	shutdown() {
		this.log("Shutting down");

		// Unregister notifier
		this.unregisterNotifier();

		// Clear element ID list
		this.addedElementIDs = [];

		// Clear other properties
		this.initialized = false;
		this.id = null;
		this.version = null;
		this.rootURI = null;
	}
};