# Changelog

## [0.0.3] - 2025-01-24

### Changed
- Cleaned up codebase for production release
- Removed debug console.log statements
- Removed unused test files (quick-test.js, test-plugin.js)

### Fixed
- Removed development artifacts from production build

## [0.0.2] - 2024-05-24 - Documentation Update

### Changed
- Updated documentation and README

## [0.0.1] - 2024-05-24 - Initial Beta Release

### Breaking Changes
- **Zotero 7 Compatibility**: Complete rewrite for Zotero 7
- Minimum Zotero version: 6.999 (Zotero 7 beta)
- Changed from XUL overlay to Bootstrap architecture

### Added
- Bootstrap-based plugin architecture
- Fluent localization system
- Modern async/await code patterns
- Proper window management with memory leak prevention
- Development scripts for easier plugin development

### Changed
- Replaced XMLHttpRequest with Zotero.HTTP.request
- Moved from chrome structure to src directory
- Updated to manifest.json (WebExtension-style)
- Improved error handling and notifications

### Removed
- XUL overlay files (chrome.manifest, overlay.xul)
- Deprecated cors-anywhere proxy dependency
- Archive.is support (due to cors-anywhere removal)
- Legacy localization files (.dtd, .properties)
- Jasmine test files from production build

### Fixed
- Memory leaks from improper window cleanup
- CORS issues with Internet Archive requests
- Plugin hanging issues during archiving

### Technical Details
- Migrated from `install.rdf` to `manifest.json`
- Implemented proper lifecycle hooks in `bootstrap.js`
- Reorganized file structure for clarity
- Added VS Code integration for development

## [1.1.1] - Previous version (as Zotero Memento)
- Last version supporting Zotero 5/6
- Original plugin ID: zotero-memento@tran.org