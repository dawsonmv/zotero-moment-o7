# Zotero Moment-o7

A modern rewrite of the classic Zotero Memento plugin, now compatible with Zotero 7.

## Features

Moment-o7 brings all the classic memento plugin functionality to Zotero 7, allowing you to archive your research articles and prevent link rot.

### Core Features

- **Automatic Archiving**: Automatically saves pages added through the Browser Connector to Internet Archive
- **Manual Archiving**: Right-click any item to archive it manually
- **Archival Metadata**: 
  - Saves archived URLs in the "Extra" field
  - Attaches notes with robust links to archived versions
  - Tags items with "archived" when complete
- **ORCID Support**: Automatically extracts and attaches author ORCID profiles (for sites supporting the Signposting standard)

## Installation

### Requirements
- Zotero 7.0 or later
- Zotero Browser Connector

### Install from Release
1. Download the latest `.xpi` file from the [Releases](https://github.com/dawsonmv/zotero-moment-o7/releases) page
2. In Zotero, go to Tools → Add-ons
3. Click the gear icon and select "Install Add-on From File..."
4. Select the downloaded `.xpi` file

### Development Installation
See [DEV_ENVIRONMENT_SETUP.md](DEV_ENVIRONMENT_SETUP.md) for development setup instructions.

## Usage

### Automatic Archiving
When you save items to Zotero using the Browser Connector, the plugin automatically:
1. Archives the webpage to Internet Archive
2. Saves the archived URL to the item's "Extra" field
3. Creates a note with a robust link
4. Adds an "archived" tag

### Manual Archiving
1. Select one or more items in your library
2. Right-click and choose "Archive this Resource"
3. Select "Internet Archive" from the submenu

### Export Translators

The plugin includes enhanced export translators that include archival information:
- **BibLaTeX** - Includes archived URLs and dates
- **MLA** - Modified to include archival metadata
- **HTML Snippet/Robust Links** - Creates robust links (see [robustlinks.mementoweb.org](http://robustlinks.mementoweb.org/))
- **Bookmarks** - Exports with archival information
- **Wikipedia Citation Template** - Includes archived versions

To install translators:
1. Navigate to `src/translators/` in the plugin directory
2. Copy the desired translator files to your Zotero translators directory
3. Restart Zotero

## Changes in Version 2.0

- Complete rewrite for Zotero 7 compatibility
- Replaced XMLHttpRequest with Zotero.HTTP.request API
- Removed cors-anywhere dependency
- Modern Bootstrap architecture
- Improved error handling and notifications
- Removed Archive.is support (technical limitations)

## Technical Details

- Built using Zotero 7's Bootstrap architecture
- Uses Fluent for localization
- Implements proper window management to prevent memory leaks
- Modern async/await patterns throughout

## Known Limitations

- Archive.is and related sites are no longer supported due to CORS restrictions
- Some websites may block automated archiving attempts

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Original Zotero Memento plugin by Leon Tran
- Harding Center for Risk Literacy for continued development
- Internet Archive for providing archival services
- Zotero development team for the plugin framework

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/dawsonmv/zotero-moment-o7/issues) page.