# Proposed Directory Structure

```
zotero-moment-o7/
├── src/
│   ├── core/                    # Core plugin functionality
│   │   ├── main.js             # Main plugin entry (from zotero-moment-o7.js)
│   │   ├── bootstrap.js        # Bootstrap loader
│   │   └── coordinator.js      # Archive coordinator
│   │
│   ├── services/               # Archive services
│   │   ├── registry.js         # Service registry
│   │   ├── base.js            # Base service class
│   │   ├── internet-archive.js
│   │   ├── archive-today.js
│   │   ├── perma-cc.js
│   │   ├── uk-web-archive.js
│   │   └── arquivo-pt.js
│   │
│   ├── features/               # Feature modules
│   │   ├── robust-links.js     # Robust link creator
│   │   ├── signpost.js         # ORCID extraction
│   │   └── memento.js          # Memento protocol
│   │
│   ├── ui/                     # User interface
│   │   ├── preferences.xhtml   # Preferences panel
│   │   └── locale/             # Translations
│   │
│   └── translators/            # Export translators
│       ├── bibtex.js
│       ├── bookmarks.js
│       ├── html-snippet.js
│       ├── mla.js
│       └── wikipedia.js
│
├── addon/                      # Addon metadata
│   └── prefs.js               # Default preferences
│
├── worker/                     # Cloudflare worker
│   └── archive-proxy.js
│
├── tests/                      # Test files
│   └── ...
│
├── scripts/                    # Build scripts
│   └── build.sh
│
└── kiss/                       # KISS version
    ├── main.js
    ├── bootstrap.js
    └── preferences.xhtml
```