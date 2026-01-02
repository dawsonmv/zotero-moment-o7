# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-01-02

### Added

- **Archive Services**: Support for 5 web archive services
  - Internet Archive (Wayback Machine) with SPN2 API support
  - Archive.today via Cloudflare Worker proxy
  - Perma.cc (academic archiving with API key)
  - UK Web Archive (nomination-based)
  - Arquivo.pt (Portuguese web archive)

- **Memento Protocol**: RFC 7089 compliant implementation
  - TimeMap and TimeGate support
  - Existing memento detection before archiving
  - Link header parsing

- **Robust Links**: Generate citation-ready links with archived fallbacks
  - Multi-service robust link creation
  - data-originalurl, data-versionurl, data-versiondate attributes
  - Copy-paste ready HTML snippets

- **Auto-Archive**: Automatically archive new items with URLs
  - Configurable per-service settings
  - Fallback chain when primary service fails
  - Rate limiting and retry logic

- **Monitoring & Observability**
  - Structured logging with RFC 5424 levels
  - Metrics collection (counters, gauges, histograms)
  - Distributed tracing for archive operations
  - Health checking for archive services
  - Circuit breaker pattern for fault tolerance

- **Preferences UI**: Full configuration panel
  - API key management with secure storage
  - Service selection and ordering
  - Timeout and retry configuration

- **Zotero Integration**
  - Context menu for archiving selected items
  - Archive URLs stored in Extra field
  - Robust link notes attached to items
  - "archived" tag for processed items

### Changed

- Enhanced type safety across all modules with strict null/undefined checks
- Improved promise error handling in concurrent operations
- Better error tracking in Promise.race() based queue system

### Fixed

- Fixed 17 TypeScript type safety issues preventing runtime errors
- Fixed unsafe regex match array access patterns
- Fixed promise rejection handling in startup initialization
- Fixed concurrent queue identity tracking for failed promises

### Technical

- Built on zotero-plugin-template for Zotero 7 compatibility
- TypeScript with strict mode
- 764 unit tests with comprehensive coverage
- ESLint + Prettier for code quality
- GitHub Actions CI/CD pipeline

### Security

- Secure credential storage via CredentialManager
  - Encryption at rest for API keys
  - Migration from plaintext prefs
- Header injection prevention in HTTP requests
- XSS protection in HTML utilities
- Input validation for all user inputs

## [Unreleased]

### Planned

- Concurrent batch archiving with traffic monitoring (max 4 parallel items)
- Signposting protocol support for ORCID extraction
- Archive status dashboard
- Export format translators (BibLaTeX, Wikipedia, etc.)

---

[0.0.3]: https://github.com/dawsonmv/zotero-moment-o7/releases/tag/v0.0.3
[Unreleased]: https://github.com/dawsonmv/zotero-moment-o7/compare/v0.0.3...HEAD
