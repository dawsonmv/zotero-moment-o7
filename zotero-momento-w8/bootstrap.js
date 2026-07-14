/* global Zotero, Services */
/* eslint-disable no-unused-vars */

// Zotero Momento-W8 — bootstrap lifecycle for Zotero 8/9
// Zotero provides the `Zotero` and `Services` globals in this scope.

let ZoteroMomentoW8;

function log(msg) {
	Zotero.debug("Zotero Momento-W8: " + msg);
}

function install(data, reason) {
	log("Installed version " + data.version);
}

function uninstall(data, reason) {
	log("Uninstalled");
}

async function startup({ id, version, rootURI }, reason) {
	log("Starting version " + version);

	// Load the main plugin script (which loads all other modules)
	Services.scriptloader.loadSubScript(rootURI + "src/momento-w8.js");

	ZoteroMomentoW8 = Zotero.MomentoW8;
	ZoteroMomentoW8.init({ id, version, rootURI });

	// Register the preferences pane
	Zotero.PreferencePanes.register({
		pluginID: id,
		src: rootURI + "content/preferences.xhtml",
		label: "Momento-W8",
		image: rootURI + "icon48.png"
	});

	// Add UI to all open Zotero windows
	ZoteroMomentoW8.addToAllWindows();

	await ZoteroMomentoW8.main();
}

function shutdown({ id, version, rootURI }, reason) {
	log("Shutting down");

	if (ZoteroMomentoW8) {
		ZoteroMomentoW8.removeFromAllWindows();
		ZoteroMomentoW8.shutdown();
		ZoteroMomentoW8 = undefined;
	}

	if (Zotero.MomentoW8) {
		delete Zotero.MomentoW8;
	}
}

function onMainWindowLoad({ window }) {
	if (ZoteroMomentoW8) {
		ZoteroMomentoW8.addToWindow(window);
	}
}

function onMainWindowUnload({ window }) {
	if (ZoteroMomentoW8) {
		ZoteroMomentoW8.removeFromWindow(window);
	}
}
