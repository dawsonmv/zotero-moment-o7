# Architecture Refactoring Plan for Enhanced Extensibility

## Overview

This plan prepares the Zotero Moment-o7 plugin for full Memento Protocol integration and easy addition of future archiving services by introducing a more structured, extensible architecture.

## Current Architecture Issues

1. **Tight Coupling**: Menu items directly call service methods
2. **No Central Coordination**: Services operate in isolation
3. **Duplicate Code**: Each service implements similar patterns
4. **No Pre-checks**: Services don't check existing archives
5. **Limited Configuration**: No unified settings management

## Proposed Architecture

### 1. Service Registry Pattern

Create a central service registry that manages all archiving services:

```javascript
// src/ServiceRegistry.js
Zotero.ServiceRegistry = {
    services: new Map(),
    
    register(id, service) {
        if (!service.id || !service.name || !service.archive) {
            throw new Error("Invalid service definition");
        }
        this.services.set(id, service);
        this.emit('service-registered', service);
    },
    
    unregister(id) {
        this.services.delete(id);
        this.emit('service-unregistered', id);
    },
    
    getService(id) {
        return this.services.get(id);
    },
    
    getEnabledServices() {
        return Array.from(this.services.values())
            .filter(s => this.isEnabled(s.id));
    },
    
    isEnabled(id) {
        return Zotero.Prefs.get(`extensions.zotero-moment-o7.service.${id}.enabled`, true);
    }
};
```

### 2. Standardized Service Interface

Define a common interface for all archiving services:

```javascript
// src/BaseArchiveService.js
Zotero.BaseArchiveService = {
    // Required properties
    id: null,           // Unique identifier
    name: null,         // Display name
    priority: 50,       // Sort order in menus
    
    // Required methods
    async canArchive(item) {
        // Check if this service can archive the item
        throw new Error("Must implement canArchive()");
    },
    
    async archive(item) {
        // Perform the archive operation
        throw new Error("Must implement archive()");
    },
    
    // Optional methods with defaults
    async isArchived(item) {
        // Check if already archived by this service
        const extra = item.getField("extra");
        return extra.includes(this.getArchivePrefix());
    },
    
    getArchivePrefix() {
        // Prefix used in Extra field
        return `${this.name}:`;
    },
    
    async checkCORS() {
        // Test if service supports direct access
        return true;
    },
    
    // Common utilities
    createProgressWindow(title) {
        return new Zotero.ProgressWindow({
            closeOnClick: true,
            headline: title || `Archiving to ${this.name}...`
        });
    },
    
    formatError(error) {
        // Service can override for custom error messages
        return this.constructor.formatError ? 
            this.constructor.formatError(error) : 
            error.message;
    }
};
```

### 3. Archive Coordinator

Central coordinator that manages the archiving workflow:

```javascript
// src/ArchiveCoordinator.js
Zotero.ArchiveCoordinator = {
    // Settings
    MEMENTO_CHECK_ENABLED: 'extensions.zotero-moment-o7.memento.checkFirst',
    MEMENTO_AGE_THRESHOLD: 'extensions.zotero-moment-o7.memento.ageThresholdDays',
    
    async archiveItems(items, serviceId = null) {
        const results = new Map();
        
        // Filter valid items
        const validItems = items.filter(item => 
            !item.isNote() && 
            !item.isAttachment() && 
            item.getField('url')
        );
        
        // Check Memento first if enabled
        if (Zotero.Prefs.get(this.MEMENTO_CHECK_ENABLED, true)) {
            await this.checkExistingArchives(validItems, results);
        }
        
        // Archive based on service selection
        if (serviceId) {
            // Single service
            await this.archiveToService(validItems, serviceId, results);
        } else {
            // All services (Robust Link)
            await this.archiveToAllServices(validItems, results);
        }
        
        return results;
    },
    
    async checkExistingArchives(items, results) {
        if (!Zotero.MementoChecker) return;
        
        const threshold = Zotero.Prefs.get(this.MEMENTO_AGE_THRESHOLD, 180);
        const thresholdMs = threshold * 24 * 60 * 60 * 1000;
        
        for (const item of items) {
            try {
                const url = item.getField('url');
                const archives = await Zotero.MementoChecker.findArchives(url);
                
                if (archives.count > 0) {
                    const lastArchiveDate = new Date(archives.last.datetime);
                    const age = Date.now() - lastArchiveDate;
                    
                    if (age < thresholdMs) {
                        results.set(item.id, {
                            status: 'skipped',
                            reason: 'recent-archive-exists',
                            archives: archives,
                            age: Math.floor(age / (24 * 60 * 60 * 1000))
                        });
                    }
                }
            } catch (error) {
                // Continue even if Memento check fails
                Zotero.debug(`Memento check failed for ${item.id}: ${error}`);
            }
        }
    },
    
    async archiveToService(items, serviceId, results) {
        const service = Zotero.ServiceRegistry.getService(serviceId);
        if (!service) throw new Error(`Service ${serviceId} not found`);
        
        const progressWin = service.createProgressWindow();
        progressWin.show();
        
        for (const item of items) {
            // Skip if already processed
            if (results.has(item.id)) continue;
            
            try {
                if (!await service.canArchive(item)) {
                    results.set(item.id, {
                        status: 'skipped',
                        reason: 'service-cannot-archive'
                    });
                    continue;
                }
                
                if (await service.isArchived(item)) {
                    results.set(item.id, {
                        status: 'skipped',
                        reason: 'already-archived'
                    });
                    continue;
                }
                
                const result = await service.archive(item);
                results.set(item.id, {
                    status: 'success',
                    service: serviceId,
                    result: result
                });
                
                progressWin.addLines([`✅ ${item.getField('title')}`]);
                
            } catch (error) {
                results.set(item.id, {
                    status: 'error',
                    service: serviceId,
                    error: service.formatError(error)
                });
                
                progressWin.addLines([`❌ ${item.getField('title')}: ${service.formatError(error)}`]);
            }
        }
        
        progressWin.startCloseTimer(8000);
    }
};
```

### 4. Enhanced Service Implementation

Refactor existing services to use the new pattern:

```javascript
// src/services/InternetArchiveService.js
Zotero.InternetArchiveService = Object.assign(Object.create(Zotero.BaseArchiveService), {
    id: 'internet-archive',
    name: 'Internet Archive',
    priority: 10,
    
    async canArchive(item) {
        const url = item.getField('url');
        return /^https?:\/\/.+/.test(url);
    },
    
    async archive(item) {
        const url = this.getBestUrl(item);
        const saveUrl = `https://web.archive.org/save/${url}`;
        
        const response = await Zotero.HTTP.request('GET', saveUrl, {
            timeout: 60000,
            responseType: 'text'
        });
        
        // Extract archived URL
        const archivedUrl = this.extractArchivedUrl(response);
        
        // Update item
        await this.updateItem(item, archivedUrl);
        
        return { archivedUrl };
    },
    
    formatError(error) {
        const errorMap = {
            523: "This site cannot be archived (blocked by publisher)",
            429: "Rate limited - please wait before trying again",
            403: "Access denied - site blocks archiving"
        };
        
        return errorMap[error.status] || error.message;
    }
});

// Register the service
Zotero.ServiceRegistry.register('internet-archive', Zotero.InternetArchiveService);
```

### 5. Dynamic Menu System

Create menus dynamically from registered services:

```javascript
// src/MenuBuilder.js
Zotero.MenuBuilder = {
    buildArchiveMenu(doc) {
        const menu = doc.createXULElement('menu');
        menu.setAttribute('label', 'Archive this Resource');
        
        const popup = doc.createXULElement('menupopup');
        
        // Add service items
        const services = Zotero.ServiceRegistry.getEnabledServices();
        services.sort((a, b) => a.priority - b.priority);
        
        for (const service of services) {
            const menuItem = this.createServiceMenuItem(doc, service);
            popup.appendChild(menuItem);
        }
        
        // Add separator
        popup.appendChild(doc.createXULElement('menuseparator'));
        
        // Add special items
        if (Zotero.MementoChecker) {
            const checkItem = this.createMenuItem(doc, {
                label: 'Check Existing Archives',
                command: () => this.checkExistingArchives()
            });
            popup.appendChild(checkItem);
        }
        
        const robustItem = this.createMenuItem(doc, {
            label: 'Create Robust Link (All Services)',
            command: () => this.createRobustLink()
        });
        popup.appendChild(robustItem);
        
        // Add settings
        popup.appendChild(doc.createXULElement('menuseparator'));
        const settingsItem = this.createMenuItem(doc, {
            label: 'Archive Settings...',
            command: () => this.openSettings()
        });
        popup.appendChild(settingsItem);
        
        menu.appendChild(popup);
        return menu;
    },
    
    createServiceMenuItem(doc, service) {
        return this.createMenuItem(doc, {
            label: service.name,
            command: async () => {
                const items = Zotero.getActiveZoteroPane().getSelectedItems();
                await Zotero.ArchiveCoordinator.archiveItems(items, service.id);
            }
        });
    }
};
```

### 6. Settings Management

Centralized settings dialog:

```javascript
// src/SettingsManager.js
Zotero.SettingsManager = {
    preferences: {
        // Memento settings
        'memento.enabled': {
            type: 'bool',
            default: true,
            label: 'Check for existing archives before creating new ones'
        },
        'memento.ageThreshold': {
            type: 'int',
            default: 180,
            label: 'Consider archives older than (days)'
        },
        
        // Service settings
        'service.internet-archive.enabled': {
            type: 'bool',
            default: true,
            label: 'Enable Internet Archive'
        },
        'service.archive-today.enabled': {
            type: 'bool',
            default: true,
            label: 'Enable Archive.today'
        },
        'service.permacc.enabled': {
            type: 'bool',
            default: false,
            label: 'Enable Perma.cc'
        },
        'service.permacc.apiKey': {
            type: 'string',
            default: '',
            label: 'Perma.cc API Key',
            secure: true
        }
    },
    
    openDialog() {
        const dialog = window.openDialog(
            'chrome://zotero-moment-o7/content/settings.xhtml',
            'moment-o7-settings',
            'chrome,centerscreen,modal'
        );
    }
};
```

### 7. Memento Integration

Full integration as a cross-cutting concern:

```javascript
// Enhanced MementoChecker
Zotero.MementoChecker = Object.assign(Zotero.MementoChecker, {
    // Add caching
    cache: new Map(),
    cacheTimeout: 3600000, // 1 hour
    
    async findArchivesCached(url) {
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.time < this.cacheTimeout) {
            return cached.data;
        }
        
        const data = await this.findArchives(url);
        this.cache.set(url, { data, time: Date.now() });
        return data;
    },
    
    // Add archive quality assessment
    assessArchiveQuality(archives) {
        const quality = {
            score: 0,
            factors: []
        };
        
        // Factor 1: Number of archives
        if (archives.count > 10) {
            quality.score += 30;
            quality.factors.push('Well archived (10+ snapshots)');
        } else if (archives.count > 5) {
            quality.score += 20;
            quality.factors.push('Moderately archived (5-10 snapshots)');
        } else if (archives.count > 0) {
            quality.score += 10;
            quality.factors.push('Minimally archived (1-5 snapshots)');
        }
        
        // Factor 2: Archive recency
        if (archives.last) {
            const age = Date.now() - new Date(archives.last.datetime);
            const days = age / (24 * 60 * 60 * 1000);
            
            if (days < 30) {
                quality.score += 30;
                quality.factors.push('Recently archived');
            } else if (days < 180) {
                quality.score += 20;
                quality.factors.push('Archived within 6 months');
            } else if (days < 365) {
                quality.score += 10;
                quality.factors.push('Archived within 1 year');
            }
        }
        
        // Factor 3: Archive diversity
        if (archives.sources.length > 2) {
            quality.score += 20;
            quality.factors.push('Multiple archive sources');
        } else if (archives.sources.length > 1) {
            quality.score += 10;
            quality.factors.push('Dual archive sources');
        }
        
        // Factor 4: Trusted sources
        const trustedSources = ['Internet Archive', 'Archive.today', 'Perma.cc'];
        const hasTrusted = archives.sources.some(s => trustedSources.includes(s));
        if (hasTrusted) {
            quality.score += 20;
            quality.factors.push('Archived by trusted source');
        }
        
        return quality;
    }
});
```

## Implementation Phases

### Phase 1: Core Refactoring (Week 1-2)
- [ ] Create ServiceRegistry
- [ ] Implement BaseArchiveService
- [ ] Create ArchiveCoordinator
- [ ] Refactor existing services to new pattern

### Phase 2: Memento Integration (Week 3)
- [ ] Enable MementoChecker by default
- [ ] Add pre-archive checking
- [ ] Implement caching layer
- [ ] Add quality assessment

### Phase 3: Enhanced UI (Week 4)
- [ ] Dynamic menu generation
- [ ] Settings dialog
- [ ] Archive status indicators
- [ ] Progress improvements

### Phase 4: Testing & Polish (Week 5)
- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Documentation updates
- [ ] Migration guide

## Benefits

1. **Easier Service Addition**: Just implement interface and register
2. **Consistent Behavior**: All services follow same patterns
3. **Better User Control**: Centralized settings
4. **Smarter Archiving**: Memento prevents duplicates
5. **Future-Proof**: Easy to add new features

## Migration Strategy

1. **Backward Compatibility**: Keep old service names as aliases
2. **Gradual Rollout**: Feature flag for new architecture
3. **Data Migration**: Preserve existing archives and settings
4. **User Communication**: Clear changelog and upgrade guide

## Example: Adding a New Service

```javascript
// src/services/NewArchiveService.js
Zotero.NewArchiveService = Object.assign(Object.create(Zotero.BaseArchiveService), {
    id: 'new-archive',
    name: 'New Archive Service',
    priority: 30,
    
    async canArchive(item) {
        // Service-specific logic
        return true;
    },
    
    async archive(item) {
        // Implementation
        const url = item.getField('url');
        const result = await this.callAPI(url);
        await this.updateItem(item, result.archiveUrl);
        return result;
    }
});

// That's it! Service is automatically added to menus and workflows
Zotero.ServiceRegistry.register('new-archive', Zotero.NewArchiveService);
```

This refactored architecture provides a solid foundation for the plugin's future growth while maintaining simplicity and consistency.