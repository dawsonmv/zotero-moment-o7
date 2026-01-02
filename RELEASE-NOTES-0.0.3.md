# Release Notes - Moment-o7 v0.0.3

**Release Date:** January 2, 2026
**Version:** 0.0.3
**Plugin ID:** momento7@zotero.org
**Zotero Compatibility:** 7.0+
**Status:** Early Pre-Release (Functional Testing Required)

---

## 🎉 What's New in v0.0.3

### Core Features

**Archive Services** - Prevent link rot by automatically archiving web resources to multiple independent archives:

- **Internet Archive (Wayback Machine)** - World's largest public web archive with SPN2 API
- **Archive.today** - Snapshot archiving with privacy focus (via Cloudflare Worker proxy)
- **Perma.cc** - Academic archiving with optional API key for authentication
- **UK Web Archive** - Official UK government web archive via nomination API
- **Arquivo.pt** - Portuguese language web archive

**Memento Protocol** - RFC 7089 compliant implementation for querying existing archives before creating new ones

- Detect if URLs have already been archived
- Retrieve archived versions and timestamps
- Support for TimeMap and TimeGate protocols

**Robust Links** - Generate citation-ready archive links that fall back gracefully if primary URL fails

- Multi-service backup links in a single click
- HTML attributes: `data-originalurl`, `data-versionurl`, `data-versiondate`
- Copy-paste ready for academic publications and web content

**Auto-Archive** - Automatically archive new items added to Zotero

- Configurable per-service auto-archiving settings
- Intelligent fallback to alternative services if primary fails
- Built-in rate limiting (1 second per service) to respect archive terms of service

**Monitoring & Observability** - Track archiving operations and service health

- RFC 5424 structured logging for debugging
- Metrics collection: counters, gauges, histograms
- Distributed tracing of archive operations
- Health checking for archive service availability
- Circuit breaker pattern prevents cascading failures

**Configuration UI** - Manage plugin settings directly in Zotero preferences

- Secure API key storage with encryption at rest
- Choose and order archive services by preference
- Configure timeouts and retry behavior
- View service health status

### Quality & Safety Improvements in v0.0.3

**Enhanced Type Safety**

- Fixed 17 TypeScript type safety issues preventing runtime TypeErrors
- Strict null/undefined checks across all modules
- Safe regex match array access with bounds checking
- Defensive function type guards

**Promise Handling**

- Fixed unhandled promise rejections in startup initialization
- Improved error tracking in concurrent Promise.race() operations
- Better error messages for debugging archive failures

**Testing**

- 764 comprehensive unit tests (expanded from 644)
- All tests passing with TypeScript strict mode
- Coverage of edge cases and error paths

---

## 🚀 Installation

1. **Download the plugin**: Get the `.xpi` file from the [releases page](https://github.com/dawsonmv/zotero-moment-o7/releases/tag/v0.0.3)

2. **Install in Zotero 7**:
   - Open Zotero 7
   - Go to **Tools** → **Add-ons** → ⚙️ (settings gear) → **Install Add-on From File...**
   - Select the downloaded `.xpi` file
   - Restart Zotero

3. **Configure (Optional)**:
   - Go to **Edit** → **Preferences** → **Moment-o7**
   - Add API keys if using authenticated services (Perma.cc, UK Web Archive)
   - Configure which services to use and their order

---

## 📋 Quick Start

### Archive a Single Item

1. Right-click on an item in Zotero
2. Select **Archive to Web** from the context menu
3. Watch the progress window as the plugin archives to available services
4. Check the item's **Extra** field for archived URLs

### Archive Multiple Items

1. Select multiple items (Ctrl+Click or Shift+Click)
2. Right-click and choose **Archive to Web**
3. Plugin processes up to 4 items concurrently
4. View progress and see completion summary

### View Robust Links

1. After archiving, check the item's **Notes** section
2. Look for notes titled "Robust Links for [Title]"
3. Copy the HTML snippets into your publications

---

## ⚙️ Configuration

### Service API Keys

**Internet Archive (Wayback Machine)** - No key required

- Respects rate limiting automatically
- Best for general public URLs

**Archive.today** - No key required

- Anonymous snapshots
- Good backup option if Wayback Machine is unavailable

**Perma.cc** - Requires API key (optional, free academic accounts)

1. Create account at https://perma.cc
2. Go to Settings → API Token
3. Copy token to Moment-o7 preferences
4. Benefits: Permanent links, long-term preservation guarantee

**UK Web Archive** - Requires API key (free, government service)

1. Request API access at https://ukwa.org.uk/about/contact
2. Add key to Moment-o7 preferences
3. Helps preserve UK-specific web content

**Arquivo.pt** - No key required

- Portuguese and Portuguese-language content
- Automatic rate limiting applied

### Preferences

- **Auto-archive new items**: Enable/disable auto-archiving when adding new items
- **Service order**: Drag to reorder which services to try first
- **Timeouts**: Adjust how long to wait for responses (default: 60 seconds)
- **Retries**: Set number of retry attempts if services fail

---

## 🔍 Testing Status

**✅ Unit Testing**: 764 tests passing (100%)
**✅ Build Verification**: Successfully builds to 79 KB XPI
**✅ Type Safety**: TypeScript strict mode, no compilation errors
**⏳ Functional Testing**: Ready for manual testing in Zotero 7 (TASK-009)

---

## ⚠️ Known Limitations

1. **Archive.today requires proxy** - Direct CORS requests blocked; plugin uses Cloudflare Worker proxy
2. **Service rate limits** - Each service enforces rate limiting; plugin respects this with 1 second minimum between requests
3. **URL validation** - Plugin requires items to have valid HTTP/HTTPS URLs to archive
4. **Requires internet** - All archive operations require active internet connection to reach services
5. **API key encryption** - API keys stored locally in Zotero profile; backup your Zotero data securely

---

## 🐛 Reporting Issues

If you encounter problems:

1. **Enable debug logging**:
   - Open Firefox browser console (Ctrl+Shift+K)
   - Look for messages starting with `[Moment-o7]`

2. **Report with details**:
   - Go to https://github.com/dawsonmv/zotero-moment-o7/issues
   - Include:
     - Zotero version (Help → About Zotero)
     - Plugin version (Edit → Preferences → Add-ons → Moment-o7)
     - Browser console errors
     - Steps to reproduce the issue

---

## 🔐 Security & Privacy

- **Credentials**: All API keys encrypted at rest in Zotero profile
- **Data**: No archive URLs sent to external services except the archives themselves
- **Logs**: Debug logs stored locally only; not transmitted
- **HTTP**: All requests use HTTPS to archive services
- **Headers**: No sensitive data in HTTP headers (header injection prevention)

---

## 📞 Support & Documentation

- **README**: https://github.com/dawsonmv/zotero-moment-o7#readme
- **Getting Started**: See GETTING_STARTED.md in repository
- **Issues**: https://github.com/dawsonmv/zotero-moment-o7/issues
- **CLAUDE.md**: Developer/contributor guidelines in repository

---

## 🎯 Roadmap

### v0.0.4+ (Planned)

- Concurrent batch archiving with traffic monitoring
- Archive status dashboard
- Signposting protocol support for ORCID extraction
- Export format translators (BibLaTeX, Wikipedia, etc.)

---

## 📄 License

Zotero Moment-o7 is released under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE)

---

## 👥 Credits

**Developed by**: Harding Center for Risk Literacy
**Built with**: Zotero Plugin Template, zotero-plugin-toolkit
**Archive Services**: Internet Archive, Archive.today, Perma.cc, UK Web Archive, Arquivo.pt

---

**Thank you for testing Moment-o7! Your feedback helps make web preservation easier for everyone.**

For functional testing, see [FUNCTIONAL-TEST-CHECKLIST.md](FUNCTIONAL-TEST-CHECKLIST.md)
