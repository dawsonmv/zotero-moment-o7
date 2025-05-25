# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero Moment-o7 is a Zotero plugin that automatically archives web resources to Internet Archive and Archive.today to prevent link rot. When items are saved via the Browser Connector, it archives them and stores archival URLs in the item's metadata. The plugin also supports creating "Robust Links" with multiple archive sources.

## Architecture

This is a Zotero 7 Bootstrap plugin with a modular service architecture:

### Core Components
- **bootstrap.js**: Main entry point with lifecycle hooks for Zotero 7
- **zotero-moment-o7.js**: Core plugin logic with window management and service initialization
- **ServiceRegistry.js**: Manages dynamic registration of archiving services
- **BaseArchiveService.js**: Base class for all archiving services
- **ArchiveCoordinator.js**: Coordinates archiving workflow with Memento pre-checks

### Archive Services
- **InternetArchiveService.js**: Internet Archive integration (extends BaseArchiveService)
- **ArchiveTodayService.js**: Archive.today integration via Cloudflare Worker
- **IaPusher.js**: Legacy Internet Archive implementation (being phased out)
- **ArchiveTodayPusher.js**: Legacy Archive.today implementation (being phased out)
- **RobustLinkCreator.js**: Creates robust links with multiple archive sources

### Additional Components
- **MementoChecker.js**: Checks existing archives using Memento Protocol
- **MementoProtocol.js**: RFC 7089 compliant Memento implementation
- **Signpost.js**: Extracts ORCID profiles using the Signposting protocol
- **moment-o7.ftl**: Fluent localization file for UI strings
- **cloudflare-worker/**: Contains the Cloudflare Worker proxy for Archive.today

## Key Technical Details

- The plugin targets Zotero 7 with Bootstrap architecture
- Uses Service Registry pattern for extensible archiving services
- Uses Zotero.HTTP.request for HTTP requests
- Archive.today support implemented via Cloudflare Worker proxy to bypass CORS
- Implements Memento Protocol (RFC 7089) to check existing archives before creating new ones
- Stores archived URLs in the item's "Extra" field and creates notes with robust links
- Includes custom export translators in src/translators/
- Generates Robust Link HTML with data-originalurl, data-versionurl, and data-versiondate attributes
- Auto-archives new items saved through Browser Connector

## Testing

- Plugin functionality can be tested through Zotero's developer tools
- Use the Error Console (Tools → Developer → Error Console) to debug

## Development Notes

- Uses Bootstrap architecture for Zotero 7
- Main namespace is Zotero.MomentO7
- To modify the plugin, edit files in src/
- Archive.today proxy URL is hardcoded in ArchiveTodayPusher.js
- Cloudflare Worker deployment details in cloudflare-worker/README.md