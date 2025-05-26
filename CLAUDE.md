# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Zotero Moment-o7 is a plugin that archives web resources to Internet Archive and Archive.today to prevent link rot.

## Architecture

### Current Branch (master)
- Complex architecture with 50+ files
- Service registry pattern, base classes, TypeScript
- See README.md for details

### KISS Branch (kiss-refactor) 
- Simple implementation with 6 files
- Direct function calls, no abstractions
- Same features, 85% less code
- **Recommended for new development**

## Key Files

### KISS Version
- `src/momento7-simple.js` - All plugin logic (280 lines)
- `bootstrap-simple.js` - Plugin lifecycle (90 lines)
- `addon/content/preferences-simple.xhtml` - Preferences UI

### Building
```bash
# Current version
npm run build

# KISS version
./build-simple.sh
```

## Development Guidelines

1. **Follow KISS principles** - Keep it simple
2. **Use Zotero APIs directly** - No unnecessary wrappers
3. **Minimize abstractions** - Direct function calls preferred
4. **Test manually** - Install .xpi in Zotero to test

## Common Tasks

- Archive to Internet Archive: `archiveToIA(url)`
- Archive to Archive.today: `archiveToAT(url)` (uses proxy)
- Create robust link: Archives to multiple services

## Testing

1. Build the plugin
2. Install in Zotero (Tools → Add-ons → Install from file)
3. Right-click an item with URL to test archiving
4. Check preferences in Zotero settings