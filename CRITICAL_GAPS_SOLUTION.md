# Critical Gaps Solution for Zotero 7 Migration

Based on analysis of the Make It Red sample plugin and research, here are the solutions for the critical gaps:

## 1. Proper Window Management to Avoid Memory Leaks

### Implementation from Make It Red:

```javascript
// bootstrap.js
var MakeItRed;

async function startup({ id, version, rootURI }) {
    Services.scriptloader.loadSubScript(rootURI + 'make-it-red.js');
    MakeItRed.init({ id, version, rootURI });
    MakeItRed.addToAllWindows();
    await MakeItRed.main();
}

function onMainWindowLoad({ window }) {
    MakeItRed.addToWindow(window);
}

function onMainWindowUnload({ window }) {
    MakeItRed.removeFromWindow(window);
}

function shutdown() {
    MakeItRed.removeFromAllWindows();
    MakeItRed = undefined;
}
```

### Key Window Management Pattern:

```javascript
// In your main plugin object
MakeItRed = {
    addedElementIDs: [],
    
    addToWindow(window) {
        let doc = window.document;
        // Add elements and store their IDs
        let menuitem = doc.createXULElement('menuitem');
        menuitem.id = 'unique-menu-id';
        doc.getElementById('menu_viewPopup').appendChild(menuitem);
        this.storeAddedElement(menuitem);
    },
    
    storeAddedElement(elem) {
        if (!elem.id) {
            throw new Error("Element must have an id");
        }
        this.addedElementIDs.push(elem.id);
    },
    
    removeFromWindow(window) {
        var doc = window.document;
        // Remove all elements added to DOM
        for (let id of this.addedElementIDs) {
            doc.getElementById(id)?.remove();
        }
    },
    
    addToAllWindows() {
        var windows = Zotero.getMainWindows();
        for (let win of windows) {
            if (!win.ZoteroPane) continue;
            this.addToWindow(win);
        }
    },
    
    removeFromAllWindows() {
        var windows = Zotero.getMainWindows();
        for (let win of windows) {
            if (!win.ZoteroPane) continue;
            this.removeFromWindow(win);
        }
    }
};
```

### Key Points:
- Store element IDs for cleanup
- Use `Zotero.getMainWindows()` to get all windows
- Clean up in both `onMainWindowUnload` and `shutdown`
- Set plugin object to `undefined` in shutdown

## 2. Replacing CORS-Anywhere Proxy with Zotero.HTTP.request

### Current Problem:
```javascript
// Old code using cors-anywhere (BROKEN)
var submitIdReq = Zotero.IaPusher.createCORSRequest("GET", 
    "https://cors-anywhere.herokuapp.com/https://archive.li/", false);
```

### Solution Using Zotero.HTTP.request:

```javascript
// New implementation for IaPusher.js
Zotero.IaPusher = {
    // Replace createCORSRequest and XMLHttpRequest usage
    async sendReq() {
        const pane = Zotero.getActiveZoteroPane();
        const selectedItems = pane.getSelectedItems();
        const item = selectedItems[0];
        const url = item.getField('url');
        
        if (!this.checkValidUrl(url)) {
            return;
        }
        
        const fullURI = this.constructUri(url);
        
        try {
            // Show progress window
            const prog = new Zotero.ProgressWindow({closeOnClick:true});
            prog.changeHeadline("Archiving... This may take a while...");
            prog.show();
            prog.startCloseTimer(10000);
            
            // Use Zotero.HTTP.request instead of XMLHttpRequest
            const response = await Zotero.HTTP.request('GET', fullURI, {
                headers: {
                    'User-Agent': 'Zotero Moment-o7',
                    'Accept': 'application/json'
                },
                timeout: 30000,
                responseType: 'text'
            });
            
            // Handle the response
            if (response.status === 200) {
                // Extract archived URL from headers or response
                const linkHeader = response.getResponseHeader('Link');
                const archivedUrl = this.getLastMemento(linkHeader);
                
                if (archivedUrl) {
                    this.setExtra(item, archivedUrl);
                    this.attachAnchorNote(item, archivedUrl);
                    item.addTag("archived");
                    await item.saveTx();
                }
            }
            
            this.handleStatus(item, null, response.status, archivedUrl);
            
        } catch (error) {
            Zotero.logError(`Archive request failed: ${error}`);
            const errorWindow = new Zotero.ProgressWindow({closeOnClick:true});
            errorWindow.changeHeadline(`Archive failed: ${error.message}`);
            errorWindow.show();
            errorWindow.startCloseTimer(5000);
        }
    },
    
    // For Internet Archive, no CORS proxy needed
    constructUri(uri) {
        if (!uri || uri === "" || typeof uri != "string") {
            return null;
        }
        // Direct request to Internet Archive API
        return 'https://web.archive.org/save/' + uri;
    }
};
```

### Solution for ArchivePusher.js (archive.is sites):

```javascript
// New implementation for ArchivePusher.js
Zotero.ArchivePusher = {
    async sendReq() {
        const item = Zotero.getActiveZoteroPane().getSelectedItems()[0];
        const url = item.getField('url');
        
        // Note: archive.is sites block automated requests
        // Options:
        // 1. Remove this feature entirely (recommended)
        // 2. Open in browser for manual archiving
        // 3. Implement server-side proxy (requires infrastructure)
        
        // Option 2 - Open in browser:
        const archiveUrl = `https://archive.today/?run=1&url=${encodeURIComponent(url)}`;
        Zotero.launchURL(archiveUrl);
        
        // Show notification
        const notifWindow = new Zotero.ProgressWindow({closeOnClick:true});
        notifWindow.changeHeadline("Opened archive.today in browser. Please complete manually.");
        notifWindow.show();
        notifWindow.startCloseTimer(5000);
    }
};
```

## 3. Understanding Zotero.HTTP.request API

### API Signature:
```javascript
Zotero.HTTP.request(method, url, options = {})
```

### Options Object:
```javascript
{
    // Request body (for POST/PUT)
    body: string | ArrayBuffer | FormData,
    
    // Request headers
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Your-Plugin-Name'
    },
    
    // Response type
    responseType: 'text' | 'json' | 'arraybuffer' | 'blob',
    
    // Timeout in milliseconds
    timeout: 30000,
    
    // Credentials
    credentials: 'omit' | 'same-origin' | 'include',
    
    // Follow redirects
    followRedirects: true,
    
    // Max redirects
    maxRedirects: 5,
    
    // Cookie jar (for maintaining sessions)
    cookieJar: null,
    
    // Progress callback
    onProgress: (progress, total) => {}
}
```

### Complete Example with Error Handling:

```javascript
async function makeAPIRequest(url, data = null) {
    try {
        const options = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000,
            responseType: 'json'
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await Zotero.HTTP.request(
            data ? 'POST' : 'GET',
            url,
            options
        );
        
        // Check status
        if (response.status >= 200 && response.status < 300) {
            return response.response; // For responseType: 'json'
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        if (error.name === 'TimeoutError') {
            Zotero.logError('Request timed out');
        } else if (error.name === 'NetworkError') {
            Zotero.logError('Network error occurred');
        } else {
            Zotero.logError(`Request failed: ${error.message}`);
        }
        throw error;
    }
}
```

### Handling Different Response Types:

```javascript
// Text response
const textResponse = await Zotero.HTTP.request('GET', url, {
    responseType: 'text'
});
const text = textResponse.response;

// JSON response
const jsonResponse = await Zotero.HTTP.request('GET', url, {
    responseType: 'json'
});
const data = jsonResponse.response;

// Binary data
const binaryResponse = await Zotero.HTTP.request('GET', url, {
    responseType: 'arraybuffer'
});
const buffer = binaryResponse.response;
```

### Important Notes:

1. **No CORS restrictions**: Unlike XMLHttpRequest in browser context, Zotero.HTTP.request runs in privileged context
2. **Automatic cookie handling**: Zotero maintains cookies automatically
3. **Better error handling**: Provides detailed error information
4. **Async/await support**: Modern promise-based API
5. **No need for cors-anywhere**: Direct requests to any domain

## Implementation Priority:

1. **First**: Replace XMLHttpRequest with Zotero.HTTP.request in IaPusher.js
2. **Second**: Implement proper window management in bootstrap.js
3. **Third**: Either remove archive.is support or implement browser-based solution
4. **Fourth**: Update error handling throughout the plugin

This approach will resolve the critical blocking issues and make the plugin compatible with Zotero 7.