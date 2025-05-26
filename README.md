# Zotero Moment-o7

A modern rewrite of the classic Zotero Memento plugin, now compatible with Zotero 7.

## Features

Moment-o7 brings all the classic memento plugin functionality to Zotero 7, allowing you to archive your research articles and prevent link rot.

### Core Features

- **Multiple Archive Services**: 
  - Internet Archive (free, unlimited)
  - Archive.today (free, rate-limited)
  - Perma.cc (academic-focused, 10 free/month)
  - UK Web Archive (UK domains only)
  - Arquivo.pt (Portuguese Web Archive)
- **Automatic Archiving**: Automatically saves pages added through the Browser Connector to Internet Archive
- **Manual Archiving**: Right-click any item to archive it manually
- **Archival Metadata**: 
  - Saves archived URLs in the "Extra" field
  - Attaches notes with robust links to archived versions
  - Tags items with service-specific tags (e.g., "archived:permacc")
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
1. Archives the webpage to your default archive service
2. Saves the archived URL to the item's "Extra" field
3. Creates a note with a robust link
4. Adds a service-specific tag (e.g., "archived:internetarchive")

### Manual Archiving
1. Select one or more items in your library
2. Right-click and choose "Archive this Resource"
3. Select your preferred archive service:
   - **Internet Archive**: Best for general web content
   - **Archive.today**: Works on sites that block Internet Archive
   - **Perma.cc**: For academic citations (requires free API key)
   - **UK Web Archive**: For UK websites only
   - **Arquivo.pt**: Portuguese Web Archive
   - **Create Robust Link**: Archives to all selected services

### Preferences
Access preferences by right-clicking any item and selecting "Archive this Resource" → "Moment-o7 Preferences..."

#### Available Settings:
- **General Settings**
  - Enable/disable automatic archiving
  - Choose default archive service
  
- **Timeout and Retry Settings**
  - Internet Archive timeout (30-300 seconds)
  - Maximum retry attempts (0-5)
  - Delay between retries (1-30 seconds)
  
- **Robust Links Settings**
  - Select which services to include when creating robust links
  
- **Fallback Order**
  - Configure the order in which services are tried when one fails
  
- **Service API Keys**
  - Add your Perma.cc API key

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
- Added support for multiple archiving services:
  - Perma.cc (academic permanent archives)
  - UK Web Archive (UK domains)
  - Arquivo.pt (Portuguese Web Archive)
- Enhanced retry logic and timeout handling
- Service-specific tagging system

## Technical Details

- Built using Zotero 7's Bootstrap architecture
- Uses Fluent for localization
- Implements proper window management to prevent memory leaks
- Modern async/await patterns throughout

## Service-Specific Notes

### Perma.cc
- Requires free API key from https://perma.cc/settings/tools
- Limited to 10 archives per month on free tier
- Designed specifically for academic citations
- Archives are permanent and court-admissible

### UK Web Archive
- Only accepts UK domain websites (.uk, .scot, .wales, etc.)
- Uses a nomination system - archives are reviewed before acceptance
- Best for UK government, academic, and cultural heritage sites

### Arquivo.pt
- Portuguese Web Archive - accepts any URL
- May be slower than other services
- Good alternative when other services fail

## Known Limitations

- Archive.is and related sites are no longer supported due to CORS restrictions
- Some websites may block automated archiving attempts
- Perma.cc free tier limited to 10 archives/month
- UK Web Archive only accepts UK domains

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