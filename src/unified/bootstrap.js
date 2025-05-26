/**
 * Unified Bootstrap - Minimal setup for Zotero 7
 */

let rootURI;

function startup({ id, version, rootURI: uri }) {
	rootURI = uri;
	
	// Load services and main logic
	Services.scriptloader.loadSubScript(rootURI + "config.js");
	Services.scriptloader.loadSubScript(rootURI + "src/core/utils.js");
	Services.scriptloader.loadSubScript(rootURI + "src/unified/archive-services.js"); 
	Services.scriptloader.loadSubScript(rootURI + "src/unified/main.js");
	
	// Initialize when Zotero is ready
	if (Zotero.isFirstParty) {
		Zotero.MomentO7.Main.init();
	} else {
		// Wait for Zotero to be ready
		const observer = {
			observe(subject, topic, data) {
				if (topic === "zotero-loaded") {
					Services.obs.removeObserver(observer, "zotero-loaded");
					Zotero.MomentO7.Main.init();
				}
			}
		};
		Services.obs.addObserver(observer, "zotero-loaded");
	}
	
	// Register preferences pane
	if (Zotero.PreferencePanes?.register) {
		Zotero.PreferencePanes.register({
			pluginID: id,
			src: rootURI + "src/unified/preferences.xhtml",
			label: "Moment-o7",
			image: rootURI + "icon48.png"
		});
	}
}

function shutdown() {
	if (Zotero.MomentO7?.Main?.shutdown) {
		Zotero.MomentO7.Main.shutdown();
	}
}

function install() {
	// Migration from old robust-link tags
	Zotero.Schema.schemaUpdatePromise.then(async () => {
		const search = new Zotero.Search();
		search.addCondition("tag", "is", "robust-link");
		const itemIDs = await search.search();
		
		if (itemIDs.length > 0) {
			Zotero.debug(`[Moment-o7] Migrating ${itemIDs.length} items with robust-link tags`);
			
			for (const id of itemIDs) {
				try {
					const item = await Zotero.Items.getAsync(id);
					if (item) {
						item.removeTag("robust-link");
						item.addTag("moment");
						await item.saveTx();
					}
				} catch (e) {
					Zotero.debug(`[Moment-o7] Migration error: ${e.message}`);
				}
			}
		}
	});
}

function uninstall() {
	// Clean up preferences
	const prefs = [
		"extensions.momento7.service.internetarchive",
		"extensions.momento7.service.archivetoday",
		"extensions.momento7.service.permacc",
		"extensions.momento7.service.ukwebarchive",
		"extensions.momento7.service.arquivopt",
		"extensions.momento7.autoArchive",
		"extensions.momento7.autoArchiveDelay",
		"extensions.momento7.createNotes",
		"extensions.momento7.permacc.apiKey",
		"extensions.momento7.permacc.folderId"
	];
	
	for (const pref of prefs) {
		if (Zotero.Prefs.has(pref)) {
			Zotero.Prefs.clear(pref);
		}
	}
}