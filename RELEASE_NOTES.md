# Zotero Moment-o7 v2.0.0

## 🎉 First Release for Zotero 7!

This is a complete rewrite of the classic Zotero Memento plugin, now fully compatible with Zotero 7.

### ✨ What's New
- **Zotero 7 Compatible**: Built using the new Bootstrap architecture
- **Modern Codebase**: Async/await patterns, proper error handling
- **Improved Performance**: Using Zotero.HTTP.request for better reliability
- **Better UX**: Clear notifications for archiving progress and errors

### 🔧 Technical Changes
- Migrated from XUL overlay to Bootstrap plugin architecture
- Replaced XMLHttpRequest with Zotero.HTTP.request API
- Removed deprecated cors-anywhere proxy dependency
- Implemented Fluent localization system
- Added comprehensive window management to prevent memory leaks

### 📦 Installation
1. Download `zotero-moment-o7.xpi` from the releases page
2. In Zotero 7: Tools → Add-ons
3. Click gear icon → Install Add-on From File
4. Select the downloaded XPI file
5. Restart Zotero

### 🚀 Features
- **Automatic Archiving**: Saves pages to Internet Archive when adding items via Browser Connector
- **Manual Archiving**: Right-click any item → "Archive this Resource"
- **Robust Links**: Creates notes with archival metadata
- **ORCID Support**: Extracts author ORCID profiles (for Signposting-enabled sites)
- **Enhanced Export**: Modified translators include archival information

### ⚠️ Known Limitations
- Archive.is support has been removed due to CORS restrictions
- Minor manifest warning in console (does not affect functionality)

### 🐛 Bug Reports
Please report issues at: https://github.com/dawsonmv/zotero-moment-o7/issues

### 🙏 Credits
- Original Zotero Memento plugin by Leon Tran
- Continued development by Harding Center for Risk Literacy
- Zotero 7 migration by contributors

---
**Full Changelog**: https://github.com/dawsonmv/zotero-moment-o7/compare/v1.1.1...v2.0.0
