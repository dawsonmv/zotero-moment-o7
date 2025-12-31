# Zotero Moment-o7

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)

**Prevent link rot by automatically archiving web resources to multiple archive services.**

Moment-o7 helps researchers preserve their web citations by creating archived copies on services like Internet Archive, Archive.today, and Perma.cc. It stores archive URLs in your Zotero items and generates [Robust Links](https://robustlinks.mementoweb.org/) for reliable citations.

## Features

### Archive Services

| Service              | Type             | API Key Required    |
| -------------------- | ---------------- | ------------------- |
| **Internet Archive** | Automatic        | Optional (SPN2 API) |
| **Archive.today**    | Automatic        | No                  |
| **Perma.cc**         | Academic         | Yes                 |
| **UK Web Archive**   | Nomination       | No                  |
| **Arquivo.pt**       | Portuguese sites | No                  |

### Key Capabilities

- **Auto-Archive**: Automatically archive new items with URLs when added to Zotero
- **Memento Protocol**: Check for existing archives before creating duplicates (RFC 7089)
- **Robust Links**: Generate citation-ready HTML with archived fallbacks
- **Fallback Chain**: Automatically try alternative services if primary fails
- **Circuit Breaker**: Gracefully handle service outages

## Installation

### From GitHub Releases (Recommended)

1. Download the latest `.xpi` file from [Releases](https://github.com/dawsonmv/zotero-moment-o7/releases)
2. In Zotero 7, go to **Tools → Add-ons**
3. Click the gear icon and select **Install Add-on From File...**
4. Select the downloaded `.xpi` file

### From Source

```bash
git clone https://github.com/dawsonmv/zotero-moment-o7.git
cd zotero-moment-o7
npm install
npm run build
# Install .scaffold/build/*.xpi in Zotero
```

## Usage

### Archive Items

1. Select one or more items in your library
2. Right-click and choose **Archive this Resource**
3. Select an archive service or **Create Robust Link (All Archives)**

### Configure Settings

1. Go to **Tools → Moment-o7 Preferences...**
2. Configure:
   - Auto-archive for new items
   - Default archive service
   - API keys for authenticated services
   - Fallback order

### API Keys

Some services require API keys for full functionality:

- **Internet Archive SPN2**: [Request access](https://archive.org/account/s3.php)
- **Perma.cc**: [Create account](https://perma.cc/)

## How It Works

### Archive Storage

When you archive an item, Moment-o7:

1. Submits the URL to the archive service
2. Stores the archive URL in the item's **Extra** field:
   ```
   internetarchiveArchived: https://web.archive.org/web/20241230.../
   ```
3. Creates a note with a **Robust Link**:
   ```html
   <a
     href="https://example.com"
     data-originalurl="https://example.com"
     data-versionurl="https://web.archive.org/web/..."
     data-versiondate="2024-12-30T12:00:00Z"
   >
     Article Title
   </a>
   ```
4. Adds an `archived` tag to the item

### Memento Protocol

Before archiving, Moment-o7 checks if archives already exist using the [Memento Protocol](https://tools.ietf.org/html/rfc7089). This prevents unnecessary duplicate archives and saves resources.

## Development

### Prerequisites

- Node.js 20+
- Zotero 7 Beta

### Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Zotero paths
npm start
```

### Testing

```bash
npm test              # Run tests
npm run test:coverage # With coverage report
npm run lint:check    # Check code style
```

### Building

```bash
npm run build   # Production build
npm run release # Create a new release
```

## Architecture

```
src/
├── modules/
│   ├── archive/          # Archive services (IA, Archive.today, etc.)
│   ├── memento/          # RFC 7089 Memento Protocol
│   ├── monitoring/       # Logging, metrics, health checks
│   └── preferences/      # Settings management
└── utils/                # Shared utilities
```

Key patterns:

- **Strategy Pattern**: Interchangeable archive services
- **Circuit Breaker**: Fault tolerance for external services
- **Singleton**: Service registry and preferences

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) - Build system and scaffolding
- [Memento Project](http://mementoweb.org/) - Web archiving standards
- [Robust Links](https://robustlinks.mementoweb.org/) - Citation link format

## Support

- [Report a bug](https://github.com/dawsonmv/zotero-moment-o7/issues)
- [Request a feature](https://github.com/dawsonmv/zotero-moment-o7/issues)

---

Made with care by the [Harding Center for Risk Literacy](https://www.hardingcenter.de/)
