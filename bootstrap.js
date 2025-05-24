var Zotero;
var ZoteroMomentO7;

function log(msg) {
  if (Zotero) {
    Zotero.debug("Zotero Moment-o7: " + msg);
  } else {
    console.log("Zotero Moment-o7: " + msg);
  }
}

// Plugin lifecycle functions
function install(data, reason) {
  log("Installing Moment-o7 version " + data.version);
}

function uninstall(data, reason) {
  log("Uninstalling Moment-o7");
}

async function startup({ id, version, rootURI }, reason) {
  log("Starting Moment-o7 version " + version);
  
  // Wait for Zotero to be ready
  if (!Zotero) {
    Zotero = Components.classes["@zotero.org/Zotero;1"]
      .getService(Components.interfaces.nsISupports)
      .wrappedJSObject;
  }
  
  // Load plugin scripts
  Services.scriptloader.loadSubScript(rootURI + "src/zotero-moment-o7.js");
  
  // Initialize plugin
  ZoteroMomentO7 = Zotero.MomentO7;
  ZoteroMomentO7.init({ id, version, rootURI });
  
  // Add to all existing windows
  ZoteroMomentO7.addToAllWindows();
  
  // Initialize main functionality
  await ZoteroMomentO7.main();
}

function shutdown({ id, version, rootURI }, reason) {
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
    if (Zotero.MomentO7) delete Zotero.MomentO7;
    if (Zotero.IaPusher) delete Zotero.IaPusher;
    if (Zotero.Signpost) delete Zotero.Signpost;
  }
}

// Window management hooks
function onMainWindowLoad({ window }) {
  if (ZoteroMomentO7) {
    ZoteroMomentO7.addToWindow(window);
  }
}

function onMainWindowUnload({ window }) {
  if (ZoteroMomentO7) {
    ZoteroMomentO7.removeFromWindow(window);
  }
}