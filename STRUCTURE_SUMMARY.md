# New Directory Structure

The project has been reorganized for better clarity and maintainability:

```
zotero-moment-o7/
├── src/                     # Main source code
│   ├── core/               # Core plugin functionality
│   │   ├── main.js        # Main plugin entry point
│   │   ├── bootstrap.js   # Plugin lifecycle management
│   │   └── coordinator.js # Archive coordination logic
│   │
│   ├── services/          # Archive service implementations
│   │   ├── base.js       # Base service class
│   │   ├── registry.js   # Service registry
│   │   ├── internet-archive.js
│   │   ├── archive-today.js
│   │   ├── perma-cc.js
│   │   ├── uk-web-archive.js
│   │   └── arquivo-pt.js
│   │
│   ├── features/          # Feature modules
│   │   ├── robust-links.js    # Robust link creation
│   │   ├── signpost.js        # ORCID extraction
│   │   ├── memento-checker.js # Memento protocol checking
│   │   └── memento-protocol.js
│   │
│   ├── ui/                # User interface
│   │   ├── preferences.xhtml  # Preferences panel
│   │   └── locale/           # Translations
│   │       └── en-US/
│   │
│   └── translators/       # Export translators
│       ├── bibtex.js
│       ├── bookmarks.js
│       ├── html-snippet.js
│       ├── mla.js
│       └── wikipedia.js
│
├── kiss/                  # KISS (simplified) version
│   ├── main.js           # All functionality in one file
│   ├── bootstrap.js      # Simple bootstrap
│   ├── preferences.xhtml # Simple preferences
│   └── prefs.js         # Default preferences
│
├── worker/               # Cloudflare Worker
│   ├── archive-proxy.js # Archive.today proxy
│   └── wrangler.toml   # Worker configuration
│
├── addon/               # Addon metadata
│   └── prefs.js        # Default preferences
│
├── scripts/            # Build scripts
│   ├── build.sh       # Main build script
│   └── build-kiss.sh  # KISS version build
│
└── tests/             # Test files
    └── utils/         # Utility tests
```

## Benefits of New Structure

1. **Clear Separation** - Code is organized by function, not by type
2. **Easy Navigation** - Related files are grouped together
3. **Scalability** - Easy to add new services or features
4. **KISS Version** - Simplified version is isolated in its own directory
5. **Build Clarity** - Source and built files are clearly separated

## File Name Changes

- Renamed to use kebab-case for consistency
- Removed "Service" suffix from filenames (directory already indicates they're services)
- Simplified translator names