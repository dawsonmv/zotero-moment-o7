# Zotero Moment-o7

A Zotero plugin that automatically archives web resources to prevent link rot.

## Features

- **Auto-archive**: Automatically archives web pages when you save them to Zotero
- **Manual archive**: Right-click any item to archive it to Internet Archive or Archive.today
- **Robust Links**: Create links with multiple archive sources as fallbacks
- **Simple preferences**: Easy configuration through Zotero's settings

## Installation

1. Download the latest `zotero-moment-o7.xpi` from [Releases](https://github.com/dawsonmv/zotero-moment-o7/releases)
2. In Zotero: Tools → Add-ons → Install Add-on From File
3. Select the downloaded .xpi file
4. Restart Zotero

## Usage

### Automatic Archiving
New items with URLs are automatically archived to Internet Archive after a short delay.

### Manual Archiving
Right-click any item with a URL and select:
- "Archive to Internet Archive"
- "Archive to Archive.today"
- "Create Robust Link" (archives to multiple services)

### Preferences
Access preferences via Tools → Add-ons → Moment-o7 → Preferences

## Development

### Building
```bash
npm install
npm run build
```

Creates `zotero-moment-o7.xpi` in the project root.

### KISS Version
A simplified version following KISS principles is available on the `kiss-refactor` branch:
- 85% less code
- Same features
- Easier to maintain

See [README-KISS.md](README-KISS.md) for details.

## License

GPL v3 - See [LICENSE](LICENSE) file.

## Credits

Based on the original Zotero Scholar Archive plugin.