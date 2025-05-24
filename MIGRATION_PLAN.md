# Zotero Moment-o7 Migration Plan for Zotero 7

## Overview
This document outlines the migration plan for updating the zotero-moment-o7 plugin from Zotero 5/6 XUL-based architecture to Zotero 7's Bootstrap architecture.

## Pre-Migration Analysis

### Current Architecture
- **Type**: XUL Overlay Extension
- **Target**: Zotero 5.x
- **Key Files**:
  - `install.rdf` - Plugin metadata
  - `chrome.manifest` - Chrome URL mappings
  - `overlay.xul` - UI overlays
  - Core scripts in `chrome/content/scripts/`

### Migration Requirements
- Convert from XUL overlays to Bootstrap architecture
- Replace RDF manifest with JSON manifest
- Implement programmatic UI modifications
- Update localization system
- Fix deprecated dependencies (cors-anywhere)

## Detailed Migration Steps

### Phase 1: Development Environment Setup

#### 1.1 Install Zotero 7 Beta
- [ ] Download Zotero 7 beta from https://www.zotero.org/support/beta_builds
- [ ] Create a separate Zotero profile for development
- [ ] Set up a test library with sample items

#### 1.2 Set Up Development Tools
- [ ] Install Node.js for build tools (if needed)
- [ ] Clone the Make It Red sample plugin as reference
- [ ] Set up VS Code with Zotero plugin development extensions

### Phase 2: Core File Migration

#### 2.1 Create manifest.json
- [ ] Extract metadata from install.rdf
- [ ] Create manifest.json with proper structure:
  ```json
  {
    "manifest_version": 2,
    "name": "Zotero Moment-o7",
    "version": "0.5.33",
    "description": "Archive web resources to prevent link rot",
    "author": "Harding Center for Risk Literacy",
    "applications": {
      "zotero": {
        "id": "zotero_memento@zotero.org",
        "strict_min_version": "6.999",
        "strict_max_version": "7.0.*"
      }
    },
    "icons": {
      "48": "icon.png",
      "96": "icon@2x.png"
    }
  }
  ```

#### 2.2 Create bootstrap.js
- [ ] Implement required lifecycle methods:
  - [ ] `startup({ id, version, rootURI }, reason)`
  - [ ] `shutdown({ id, version, rootURI }, reason)`
  - [ ] `install(data, reason)`
  - [ ] `uninstall(data, reason)`
- [ ] Add window management hooks:
  - [ ] `onMainWindowLoad({ window })`
  - [ ] `onMainWindowUnload({ window })`

#### 2.3 Remove Legacy Files
- [ ] Delete chrome.manifest
- [ ] Delete install.rdf (after manifest.json is working)
- [ ] Archive overlay.xul (will convert to JS)

### Phase 3: Script Loading and Initialization

#### 3.1 Update Script Loading
- [ ] Move script loading from overlay.xul to bootstrap.js
- [ ] Use `Services.scriptloader.loadSubScript()` for:
  - [ ] Signpost.js
  - [ ] IaPusher.js
  - [ ] ArchivePusher.js
  - [ ] ZoteroArchive.js

#### 3.2 Namespace Management
- [ ] Ensure proper namespace initialization in startup()
- [ ] Add cleanup in shutdown() to prevent memory leaks
- [ ] Handle multiple window instances properly

### Phase 4: UI Migration

#### 4.1 Context Menu Implementation
- [ ] Convert XUL menu to JavaScript DOM manipulation
- [ ] Create menu items programmatically:
  ```javascript
  function addMenuItem(window) {
    const doc = window.document;
    const menuitem = doc.createXULElement('menuitem');
    menuitem.setAttribute('label', 'Archive this Resource');
    menuitem.setAttribute('id', 'zotero-memento-archive');
    
    const menu = doc.createXULElement('menu');
    menu.appendChild(menuitem);
    
    const zoteroItemMenu = doc.getElementById('zotero-itemmenu');
    zoteroItemMenu.appendChild(menu);
  }
  ```

#### 4.2 Event Handlers
- [ ] Migrate click handlers from XUL to JavaScript
- [ ] Ensure proper context for selected items
- [ ] Add keyboard shortcuts if applicable

### Phase 5: Localization

#### 5.1 Create Fluent Files
- [ ] Create directory structure: `locale/en-US/`
- [ ] Create `memento.ftl` with translations:
  ```
  archive-resource = Archive this Resource
  archive-internet-archive = Internet Archive
  archive-success = Successfully archived to { $url }
  archive-error = Failed to archive: { $error }
  ```

#### 5.2 Implement Localization
- [ ] Load Fluent files in bootstrap.js
- [ ] Update UI elements to use data-l10n-id
- [ ] Test string substitution

### Phase 6: Dependency Updates

#### 6.1 Replace cors-anywhere Proxy
- [ ] Research alternatives for CORS handling:
  - [ ] Use Zotero's built-in HTTP methods
  - [ ] Implement server-side proxy (if needed)
  - [ ] Use browser extension permissions
- [ ] Update ArchivePusher.js to remove proxy dependency
- [ ] Test archive.is functionality

#### 6.2 Update API Endpoints
- [ ] Verify Internet Archive API compatibility
- [ ] Update ORCID API endpoints if changed
- [ ] Test Signposting protocol implementation

### Phase 7: Testing

#### 7.1 Unit Testing
- [ ] Update Jasmine tests for new architecture
- [ ] Move tests out of production code
- [ ] Create test harness for bootstrap environment

#### 7.2 Integration Testing
- [ ] Test automatic archiving on item save
- [ ] Test manual archiving via context menu
- [ ] Test all export translators
- [ ] Test ORCID extraction
- [ ] Test error handling and edge cases

#### 7.3 Compatibility Testing
- [ ] Test on Windows, macOS, and Linux
- [ ] Test with different Zotero 7 versions
- [ ] Test upgrade from old version

### Phase 8: Documentation and Release

#### 8.1 Update Documentation
- [ ] Update README.md for Zotero 7
- [ ] Update CLAUDE.md with new architecture
- [ ] Create CHANGELOG.md
- [ ] Document new development workflow

#### 8.2 Release Preparation
- [ ] Create update.json for automatic updates
- [ ] Build .xpi package
- [ ] Test installation process
- [ ] Create GitHub release

## Implementation Order

### Week 1: Foundation
1. Set up development environment
2. Create manifest.json
3. Create basic bootstrap.js
4. Get plugin loading in Zotero 7

### Week 2: Core Functionality
1. Migrate script loading
2. Implement UI elements
3. Test basic archiving functionality

### Week 3: Polish and Dependencies
1. Fix cors-anywhere issue
2. Implement localization
3. Update tests

### Week 4: Testing and Release
1. Comprehensive testing
2. Documentation updates
3. Release preparation

## Risk Mitigation

### High-Risk Items
1. **CORS Proxy Dependency**: Critical blocker - needs immediate solution
2. **API Changes**: Internet Archive or ORCID APIs may have changed
3. **Translator Compatibility**: Custom translators may need updates

### Fallback Plans
1. Maintain Zotero 6 version temporarily
2. Implement gradual feature migration
3. Consider splitting into core + advanced features

## Success Criteria
- [ ] Plugin loads without errors in Zotero 7
- [ ] All archiving functionality works
- [ ] Context menu appears and functions
- [ ] No memory leaks or performance issues
- [ ] Passes all tests
- [ ] Users can upgrade seamlessly

## Resources
- [Zotero 7 Developer Guide](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Make It Red Sample Plugin](https://github.com/zotero/make-it-red)
- [Zotero Forums - Development](https://forums.zotero.org/categories/dev)
- [Fluent Localization Docs](https://projectfluent.org/)