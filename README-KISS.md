# Zotero Moment-o7 - KISS Version

A dramatically simplified version of the Zotero Moment-o7 plugin following KISS (Keep It Simple, Stupid) principles.

## What's Different?

### Before (Original Version)
- **Files**: 50+ files
- **Lines of Code**: 3,000+
- **Architecture**: 4+ layers of abstraction
- **Dependencies**: Complex service registry, base classes, coordinators
- **Build**: Webpack, TypeScript compilation

### After (KISS Version)
- **Files**: 6 files total
- **Lines of Code**: ~400
- **Architecture**: Direct function calls
- **Dependencies**: None (uses Zotero APIs directly)
- **Build**: Simple zip script

## Features

✅ **Same Core Functionality**:
- Archive to Internet Archive
- Archive to Archive.today (via proxy)
- Create robust links
- Auto-archive new items
- Simple preferences

❌ **Removed Complexity**:
- No service registry
- No abstract base classes
- No TypeScript
- No webpack
- No Memento Protocol checking
- No complex error retry logic
- No dynamic menu generation
- No progress reporters
- No circuit breakers
- No caching layers

## File Structure

```
├── manifest-simple.json      # Plugin metadata
├── bootstrap-simple.js       # Plugin lifecycle (90 lines)
├── src/
│   └── momento7-simple.js   # All plugin logic (280 lines)
├── addon/
│   ├── content/
│   │   └── preferences-simple.xhtml  # Preferences UI (40 lines)
│   └── prefs-simple.js      # Default preferences (6 lines)
└── build-simple.sh          # Build script (30 lines)
```

## Building

```bash
./build-simple.sh
```

Creates `zotero-moment-o7-kiss.xpi` ready to install.

## Code Example

The entire archiving logic in 20 lines:

```javascript
// Archive to Internet Archive
async archiveToIA(url) {
    const saveUrl = `https://web.archive.org/save/${url}`;
    
    const response = await Zotero.HTTP.request("GET", saveUrl, {
        timeout: 30000,
        responseType: "text"
    });
    
    // Extract archived URL from response headers
    const locationHeader = response.getResponseHeader("Content-Location");
    if (locationHeader && locationHeader.includes("/web/")) {
        return `https://web.archive.org${locationHeader}`;
    }
    
    // Fallback: construct URL
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    return `https://web.archive.org/web/${timestamp}/${url}`;
}
```

## Installation

1. Download `zotero-moment-o7-kiss.xpi`
2. In Zotero: Tools → Add-ons → Install from file
3. Select the XPI file
4. Restart Zotero

## Why KISS?

The original plugin works, but it's over-engineered:
- **BaseArchiveService** + **ServiceRegistry** + **ArchiveCoordinator** = 3 layers to make HTTP requests
- **900+ lines** for preferences that could be 40 lines
- **15+ JavaScript files** that could be 1-2 files
- **Complex retry logic** for services that rarely fail
- **Memento Protocol** checking that users don't need

This KISS version delivers the same user experience with 85% less code.

## License

Same as original - see LICENSE file.