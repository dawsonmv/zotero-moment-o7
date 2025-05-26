/* global Zotero, Components, Services */
/* eslint-disable no-unused-vars */

let ZoteroMomentO7;

function log(msg) {
	if (Zotero) {
		Zotero.debug("Zotero Moment-o7: " + msg);
	} else {
		console.log("Zotero Moment-o7: " + msg); // eslint-disable-line no-console
	}
}

// Plugin lifecycle functions - these are called by Zotero
function install(data, _reason) {
	log("Installing Moment-o7 version " + data.version);
}

function uninstall(_data, _reason) {
	log("Uninstalling Moment-o7");
}

async function startup({ id, version, rootURI }, _reason) {
	log("Starting Moment-o7 version " + version);

	// Wait for Zotero to be ready
	if (!Zotero) {
		// eslint-disable-next-line no-global-assign
		Zotero = Components.classes["@zotero.org/Zotero;1"]
			.getService(Components.interfaces.nsISupports)
			.wrappedJSObject;
	}

	// Load the main module
	Services.scriptloader.loadSubScript(rootURI + "main.js");

	// Initialize plugin
	ZoteroMomentO7 = Zotero.MomentO7;
	ZoteroMomentO7.init({ id, version, rootURI });

	// Register preferences pane for Zotero 7
	if (Zotero.PreferencePanes && Zotero.PreferencePanes.register) {
		Zotero.PreferencePanes.register({
			pluginID: "zotero-moment-o7@github.com",
			src: rootURI + "src/ui/preferences.xhtml",
			label: "Moment-o7",
			image: rootURI + "icon48.png"
		});
	}

	// Add to all existing windows
	ZoteroMomentO7.addToAllWindows();

	// Initialize main functionality
	await ZoteroMomentO7.main();
}

function shutdown({ _id, _version, _rootURI }, _reason) {
	log("Shutting down Moment-o7");

	if (ZoteroMomentO7) {
		// Remove from all windows
		ZoteroMomentO7.removeFromAllWindows();

		// Clean up
		ZoteroMomentO7.shutdown();
		ZoteroMomentO7 = undefined;
	}

	// Clear any remaining references
	if (Zotero) {
		if (Zotero.MomentO7) {
			delete Zotero.MomentO7;
		}
		if (Zotero.IaPusher) {
			delete Zotero.IaPusher;
		}
		if (Zotero.Signpost) {
			delete Zotero.Signpost;
		}
		if (Zotero.ArchiveTodayPusher) {
			delete Zotero.ArchiveTodayPusher;
		}
		if (Zotero.MomentCreator) {
			delete Zotero.MomentCreator;
		}
	}
}

// Window management hooks
function onMainWindowLoad({ _window }) {
	if (ZoteroMomentO7) {
		ZoteroMomentO7.addToWindow(window);
	}
}

function onMainWindowUnload({ _window }) {
	if (ZoteroMomentO7) {
		ZoteroMomentO7.removeFromWindow(window);
	}
}