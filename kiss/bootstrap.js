/**
 * Zotero Moment-o7 Bootstrap - KISS Implementation
 */

/* global Services, Zotero */
/* eslint-disable no-unused-vars */

const { interfaces: Ci } = Components;

function log(msg) {
	Zotero.debug(`Moment-o7: ${msg}`);
}

// Plugin startup
async function startup({ id, version, rootURI }, _reason) {
	log(`Starting Moment-o7 ${version}`);

	await Zotero.Schema.schemaUpdatePromise;

	// Load the simple plugin file
	Services.scriptloader.loadSubScript(rootURI + "src/momento7-simple.js");

	// Initialize
	Zotero.MomentO7.init({ id, version, rootURI });

	// Register preferences if Zotero 7
	if (Zotero.PreferencePanes?.register) {
		Zotero.PreferencePanes.register({
			pluginID: id,
			src: rootURI + "addon/content/preferences-simple.xhtml",
			label: "Moment-o7",
			image: rootURI + "icon48.png"
		});
	}

	// Add to all windows
	const windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		const win = windows.getNext();
		if (win.ZoteroPane) {
			Zotero.MomentO7.addToWindow(win);
		}
	}

	// Listen for new windows
	Services.wm.addListener(windowListener);

	log("Moment-o7 started");
}

// Plugin shutdown
function shutdown({ _id, _version, _rootURI }, _reason) {
	log("Shutting down Moment-o7");

	// Remove from windows
	const windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		const win = windows.getNext();
		removeFromWindow(win);
	}

	// Stop listening
	Services.wm.removeListener(windowListener);

	// Cleanup
	if (Zotero.MomentO7) {
		Zotero.MomentO7.shutdown();
		delete Zotero.MomentO7;
	}

	log("Moment-o7 shutdown complete");
}

// Window listener
const windowListener = {
	onOpenWindow(xulWindow) {
		const win = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
			.getInterface(Ci.nsIDOMWindow);
		win.addEventListener("load", () => {
			if (win.ZoteroPane && Zotero.MomentO7) {
				Zotero.MomentO7.addToWindow(win);
			}
		}, { once: true });
	},
	onCloseWindow(_xulWindow) {},
	onWindowTitleChange(_xulWindow, _title) {}
};

// Remove plugin from window
function removeFromWindow(win) {
	const doc = win.document;

	// Remove menu items
	const ids = [
		"momento7-separator",
		"momento7-internetarchive",
		"momento7-archivetoday",
		"momento7-robust"
	];

	ids.forEach(id => {
		const elem = doc.getElementById(id);
		if (elem) {
			elem.remove();
		}
	});
}

function install() {}
function uninstall() {}