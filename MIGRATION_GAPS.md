# Migration Plan Documentation Gaps

This document identifies areas in the migration plan that need additional implementation details or documentation.

## 1. Bootstrap.js Window Management Implementation

### What We Know:
- Zotero 7 provides `onMainWindowLoad(window)` and `onMainWindowUnload(window)` hooks
- These are separate from lifecycle hooks (startup/shutdown)
- Must handle multiple windows and clean up references to prevent memory leaks

### What's Missing:
- Exact implementation pattern for managing window references
- How to properly store and clean up window-specific objects
- Best practices for handling multiple window instances

### Recommended Solution:
```javascript
// Store window references
var windows = new WeakMap();

function onMainWindowLoad({ window }) {
    // Store window-specific data
    windows.set(window, {
        menuItems: [],
        observers: []
    });
    
    // Add UI elements
    addMenuItems(window);
}

function onMainWindowUnload({ window }) {
    // Clean up window-specific references
    const data = windows.get(window);
    if (data) {
        // Remove observers, menu items, etc.
        windows.delete(window);
    }
}
```

## 2. Script Loading with Services.scriptloader

### What We Know:
- Use `Services.scriptloader.loadSubScript()` to load plugin scripts
- Scripts are cached by default (potential issue during development)
- Need to wait for Zotero to be ready before accessing it

### What's Missing:
- Exact syntax and error handling
- How to handle script dependencies
- Cache-busting during development

### Recommended Implementation:
```javascript
function startup({ id, version, rootURI }, reason) {
    // Wait for Zotero to be ready
    if (!Zotero) {
        Zotero = Components.classes['@zotero.org/Zotero;1']
            .getService(Components.interfaces.nsISupports)
            .wrappedJSObject;
    }
    
    // Load scripts with cache busting for development
    const scripts = [
        'chrome/content/scripts/Signpost.js',
        'chrome/content/scripts/IaPusher.js',
        'chrome/content/scripts/ArchivePusher.js',
        'chrome/content/scripts/ZoteroArchive.js'
    ];
    
    scripts.forEach(script => {
        const scriptURI = rootURI + script;
        // Add timestamp for cache busting in development
        const bust = reason == ADDON_INSTALL ? '' : '?' + Date.now();
        Services.scriptloader.loadSubScript(scriptURI + bust, {}, 'UTF-8');
    });
}
```

## 3. Fluent Localization Setup

### What We Know:
- Create locale folders with .ftl files
- Files are automatically registered
- Use `data-l10n-id` for string substitution

### What's Missing:
- How to link Fluent files to documents
- How to programmatically set localized strings
- How to handle dynamic string arguments

### Recommended Implementation:
```javascript
function addLocalizedMenuItem(window) {
    const doc = window.document;
    
    // Add link to Fluent file
    const link = doc.createElementNS('http://www.w3.org/1999/xhtml', 'link');
    link.rel = 'localization';
    link.href = 'locale/memento.ftl';
    doc.head.appendChild(link);
    
    // Create menu with localized string
    const menuitem = doc.createXULElement('menuitem');
    menuitem.setAttribute('data-l10n-id', 'archive-resource');
    
    // For dynamic arguments
    menuitem.setAttribute('data-l10n-args', JSON.stringify({
        count: 5,
        service: 'Internet Archive'
    }));
}
```

## 4. CORS and HTTP Requests

### What We Know:
- cors-anywhere proxy is deprecated and rate-limited
- XMLHttpRequest has CORS restrictions
- Zotero has built-in HTTP methods

### What's Missing:
- How to use Zotero.HTTP.request properly
- How to handle authentication/cookies
- Alternative approaches for archive.is

### Recommended Implementation:
```javascript
// Replace XMLHttpRequest with Zotero.HTTP.request
async function archiveResource(url) {
    try {
        const response = await Zotero.HTTP.request(
            'GET',
            `https://web.archive.org/save/${url}`,
            {
                responseType: 'text',
                headers: {
                    'User-Agent': 'Zotero Moment-o7'
                },
                timeout: 30000
            }
        );
        
        // Process response
        return response.responseText;
    } catch (error) {
        Zotero.logError(`Archive failed: ${error}`);
        throw error;
    }
}

// For archive.is - may need server-side proxy
// Consider removing this feature or implementing differently
```

## 5. Creating Context Menus Programmatically

### What We Know:
- Need to convert XUL overlay to JavaScript DOM manipulation
- Use `doc.createXULElement()` for menu items

### What's Missing:
- Complete menu structure with submenus
- Event handler attachment
- Proper menu positioning

### Recommended Implementation:
```javascript
function addContextMenu(window) {
    const doc = window.document;
    const zoteroItemMenu = doc.getElementById('zotero-itemmenu');
    
    // Create menu with submenu
    const menu = doc.createXULElement('menu');
    menu.setAttribute('id', 'zotero-memento-menu');
    menu.setAttribute('label', 'Archive this Resource');
    
    const menupopup = doc.createXULElement('menupopup');
    
    const iaMenuItem = doc.createXULElement('menuitem');
    iaMenuItem.setAttribute('label', 'Internet Archive');
    iaMenuItem.addEventListener('command', () => {
        archiveSelectedItems('ia');
    });
    
    menupopup.appendChild(iaMenuItem);
    menu.appendChild(menupopup);
    
    // Add separator before our menu
    const separator = doc.createXULElement('menuseparator');
    zoteroItemMenu.appendChild(separator);
    zoteroItemMenu.appendChild(menu);
    
    // Store references for cleanup
    const windowData = windows.get(window);
    windowData.menuItems.push(separator, menu);
}
```

## 6. Testing Framework Migration

### What We Know:
- Currently uses Jasmine in production code
- Need to move tests out of production

### What's Missing:
- How to set up test environment for bootstrap plugins
- How to test window management hooks
- Integration testing approach

### Recommended Approach:
- Move Jasmine to development dependencies
- Create separate test runner that loads plugin in test mode
- Use Zotero's built-in test framework if available
- Consider using mocha-zotero-plugin or similar

## 7. Update Manifest for Auto-Updates

### What We Know:
- Need update.json for automatic updates
- Should be referenced in manifest.json

### What's Missing:
- Exact format and hosting requirements
- How to handle version compatibility

### Recommended Implementation:
```json
// In manifest.json
{
    "applications": {
        "zotero": {
            "update_url": "https://github.com/dawsonmv/zotero-moment-o7/releases/latest/download/update.json"
        }
    }
}

// update.json format
{
    "addons": {
        "zotero_memento@zotero.org": {
            "updates": [
                {
                    "version": "1.0.0",
                    "update_link": "https://github.com/dawsonmv/zotero-moment-o7/releases/download/v1.0.0/zotero-moment-o7.xpi",
                    "applications": {
                        "zotero": {
                            "strict_min_version": "6.999"
                        }
                    }
                }
            ]
        }
    }
}
```

## Next Steps

1. Clone the Make It Red sample plugin and examine src-2.0 for complete examples
2. Set up a development environment with Zotero 7 beta
3. Start with basic bootstrap.js implementation and test window hooks
4. Incrementally migrate features while testing each step
5. Consider joining the zotero-dev mailing list for specific questions

## Resources Needed

- [ ] Complete bootstrap.js example from Make It Red
- [ ] Zotero 7 API documentation (if available)
- [ ] Examples of plugins using Zotero.HTTP.request
- [ ] Testing framework documentation for Zotero 7 plugins