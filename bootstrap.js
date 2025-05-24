var Zotero;
var ZoteroMemento;

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
  Services.scriptloader.loadSubScript(rootURI + "src/zotero-memento.js");
  
  // Initialize plugin
  ZoteroMemento = Zotero.Memento;
  ZoteroMemento.init({ id, version, rootURI });
  
  // Add to all existing windows
  ZoteroMemento.addToAllWindows();
  
  // Initialize main functionality
  await ZoteroMemento.main();
}

function shutdown({ id, version, rootURI }, reason) {
  log("Shutting down Moment-o7");
  
  if (ZoteroMemento) {
    // Remove from all windows
    ZoteroMemento.removeFromAllWindows();
    
    // Clean up
    ZoteroMemento.shutdown();
    ZoteroMemento = undefined;
  }
  
  // Clear any remaining references
  if (Zotero) {
    if (Zotero.Memento) delete Zotero.Memento;
    if (Zotero.IaPusher) delete Zotero.IaPusher;
    if (Zotero.Signpost) delete Zotero.Signpost;
  }
}

// Window management hooks
function onMainWindowLoad({ window }) {
  if (ZoteroMemento) {
    ZoteroMemento.addToWindow(window);
  }
}

function onMainWindowUnload({ window }) {
  if (ZoteroMemento) {
    ZoteroMemento.removeFromWindow(window);
  }
}