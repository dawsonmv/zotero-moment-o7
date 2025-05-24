# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero Moment-o7 is a Zotero plugin that automatically archives web resources to Internet Archive to prevent link rot. When items are saved via the Browser Connector, it archives them and stores archival URLs in the item's metadata.

## Architecture

This is a classic Firefox/Zotero XUL extension with the following key components:

- **ZoteroArchive.js**: Main entry point that registers a Zotero.Notifier observer to detect new items
- **IaPusher.js**: Handles archiving to Internet Archive via web.archive.org/save API
- **ArchivePusher.js**: Alternative archiver for archive.is family (currently uses deprecated cors-anywhere proxy)
- **Signpost.js**: Extracts ORCID profiles using the Signposting protocol
- **overlay.xul**: UI integration that loads scripts and adds context menu items

## Key Technical Details

- The plugin targets Zotero 5.x (per install.rdf) but README claims Zotero 7 compatibility
- Uses CORS requests to archive resources, with ArchivePusher relying on cors-anywhere proxy
- Stores archived URLs in the item's "Extra" field and creates notes with robust links
- Includes custom export translators in chrome/content/scripts/translators/

## Testing

Tests use Jasmine framework located in chrome/content/Jasmine/:
- Open chrome/content/Jasmine/jasmine-standalone-3.4.0/SpecRunner.html in a browser
- Test suites: UtilSuite.js and ZMementoSuite.js

## Development Notes

- No build process - this is a simple XUL extension that loads directly
- To modify the plugin, edit files in chrome/content/scripts/
- The cors-anywhere proxy usage in ArchivePusher.js is problematic due to rate limits
- Consider updating to Zotero 7 Bootstrap architecture and removing proxy dependencies