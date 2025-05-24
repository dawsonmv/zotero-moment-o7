// Main plugin object
Zotero.Memento = {
  id: null,
  version: null,
  rootURI: null,
  initialized: false,
  addedElementIDs: [],
  windows: new WeakMap(),
  notifierID: null,
  
  init({ id, version, rootURI }) {
    if (this.initialized) return;
    
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = true;
    
    this.log("Initializing Zotero Moment-o7 v" + version);
    
    // Load other modules
    Services.scriptloader.loadSubScript(rootURI + "src/Signpost.js");
    Services.scriptloader.loadSubScript(rootURI + "src/IaPusher.js");
    
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
      notify: async (event, type, ids, extraData) => {
        if (type === 'item' && event === 'add') {
          this.log("New items added: " + ids.join(', '));
          
          for (let id of ids) {
            try {
              const item = await Zotero.Items.getAsync(id);
              
              // Only process web pages and other items with URLs
              if (item && item.getField('url') && !Zotero.IaPusher.isArchived(item)) {
                this.log("Archiving item: " + item.getField('title'));
                
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
    
    this.notifierID = Zotero.Notifier.registerObserver(notifierCallbacks, ['item']);
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
    if (!window || !window.document) return;
    
    const doc = window.document;
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
    } catch (e) {
      // Fluent files not yet created, will add later
      this.log("Fluent localization not yet available");
    }
  },
  
  addMenuItems(window) {
    const doc = window.document;
    const zoteroItemMenu = doc.getElementById('zotero-itemmenu');
    
    if (!zoteroItemMenu) {
      this.log("Item menu not found, will retry later");
      return;
    }
    
    // Create separator
    const separator = doc.createXULElement('menuseparator');
    separator.id = 'zotero-moment-o7-separator';
    
    // Create main menu
    const menu = doc.createXULElement('menu');
    menu.id = 'zotero-moment-o7-menu';
    menu.setAttribute('label', 'Archive this Resource');
    
    // Create popup
    const menupopup = doc.createXULElement('menupopup');
    
    // Create Internet Archive menu item
    const iaMenuItem = doc.createXULElement('menuitem');
    iaMenuItem.id = 'zotero-moment-o7-ia';
    iaMenuItem.setAttribute('label', 'Internet Archive');
    
    // Add click handler
    iaMenuItem.addEventListener('command', async (event) => {
      try {
        await Zotero.IaPusher.sendReq();
      } catch (error) {
        this.log("Error archiving to Internet Archive: " + error);
      }
    });
    
    // Assemble menu
    menupopup.appendChild(iaMenuItem);
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
    if (!window || !window.document) return;
    
    const doc = window.document;
    this.log("Removing from window");
    
    // Remove all elements added to DOM
    for (let id of this.addedElementIDs) {
      const elem = doc.getElementById(id);
      if (elem) {
        elem.remove();
      }
    }
    
    // Remove Fluent link if it exists
    const fluentLink = doc.querySelector('[href="moment-o7.ftl"]');
    if (fluentLink) {
      fluentLink.remove();
    }
    
    // Clear window data
    this.windows.delete(window);
  },
  
  addToAllWindows() {
    const windows = Zotero.getMainWindows();
    for (let win of windows) {
      if (!win.ZoteroPane) continue;
      this.addToWindow(win);
    }
  },
  
  removeFromAllWindows() {
    const windows = Zotero.getMainWindows();
    for (let win of windows) {
      if (!win.ZoteroPane) continue;
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