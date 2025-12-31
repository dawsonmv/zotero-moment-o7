# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-30

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

### Technical

- Built on zotero-plugin-template for Zotero 7 compatibility
- TypeScript with strict mode
- 644 unit tests with 88% code coverage
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

- Signposting protocol support for ORCID extraction
- Batch archiving improvements
- Archive status dashboard
- Export format translators (BibLaTeX, Wikipedia, etc.)

---

[1.0.0]: https://github.com/dawsonmv/zotero-moment-o7/releases/tag/v1.0.0
[Unreleased]: https://github.com/dawsonmv/zotero-moment-o7/compare/v1.0.0...HEAD
