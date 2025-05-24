# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero Moment-o7 is a Zotero plugin that automatically archives web resources to Internet Archive to prevent link rot. When items are saved via the Browser Connector, it archives them and stores archival URLs in the item's metadata.

## Architecture

This is a Zotero 7 Bootstrap plugin with the following key components:

- **bootstrap.js**: Main entry point with lifecycle hooks for Zotero 7
- **zotero-moment-o7.js**: Core plugin logic with window management and notifier registration
- **IaPusher.js**: Handles archiving to Internet Archive via web.archive.org/save API
- **Signpost.js**: Extracts ORCID profiles using the Signposting protocol
- **moment-o7.ftl**: Fluent localization file for UI strings

## Key Technical Details

- The plugin now targets Zotero 7 with Bootstrap architecture
- Uses Zotero.HTTP.request for archiving to Internet Archive
- Stores archived URLs in the item's "Extra" field and creates notes with robust links
- Includes custom export translators in src/translators/

## Testing

- Plugin functionality can be tested through Zotero's developer tools
- Use the Error Console (Tools → Developer → Error Console) to debug

## Development Notes

- Uses Bootstrap architecture for Zotero 7
- Main namespace is Zotero.MomentO7
- To modify the plugin, edit files in src/
- Archive.is support has been removed due to CORS limitations