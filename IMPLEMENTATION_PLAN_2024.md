# Comprehensive Implementation Plan for Additional Archiving Services (2024)

## Executive Summary

This document outlines the implementation plan for adding multiple archiving services to Zotero Moment-o7, based on current API documentation and service availability as of 2024.

## Service Priority and Implementation Order

### Phase 1: Perma.cc (High Priority - Q1 2025)
**Why First**: Most relevant for academic users, stable API, clear documentation

### Phase 2: Memento Protocol (Medium Priority - Q2 2025)
**Why Second**: Enhances existing functionality, prevents duplicate archiving

### Phase 3: Other Services (Low Priority - Q3 2025)
**Why Later**: Less clear API access or limited use cases

## Detailed Implementation Plans

### 1. Perma.cc Implementation

#### API Details
- **Base URL**: `https://api.perma.cc/v1/`
- **Authentication**: API Key in Authorization header
- **Format**: `Authorization: ApiKey your-api-key`
- **Rate Limits**: Not explicitly stated, but free tier limited to 10 archives/month

#### Key Endpoints
```javascript
// Create archive
POST https://api.perma.cc/v1/archives/
{
  "url": "http://example.com",
  "folder": 1,  // optional
  "title": "Optional title"  // optional
}

// Get archive details
GET https://api.perma.cc/v1/archives/{guid}/

// Get user info (includes quota)
GET https://api.perma.cc/v1/user/
```

#### Implementation Steps
1. **Update PermaCCPusher.js** with current API endpoints
2. **Add settings UI** for API key management
3. **Implement quota tracking** to warn users before hitting limits
4. **Add folder support** for organization users
5. **Create test suite** for API interactions

#### Code Structure
```javascript
// src/PermaCCPusher.js enhancements
Zotero.PermaCCPusher = {
    API_VERSION: "v1",
    API_BASE: "https://api.perma.cc",
    
    // Quota management
    quotaCache: null,
    quotaCacheTime: null,
    QUOTA_CACHE_DURATION: 3600000, // 1 hour
    
    async checkQuotaCached() {
        const now = Date.now();
        if (!this.quotaCache || 
            now - this.quotaCacheTime > this.QUOTA_CACHE_DURATION) {
            this.quotaCache = await this.checkQuota();
            this.quotaCacheTime = now;
        }
        return this.quotaCache;
    }
};
```

### 2. Memento Protocol Implementation

#### Protocol Details
- **RFC**: 7089 (stable since 2013)
- **Key Components**: TimeGate, TimeMap, Memento, Original Resource
- **Headers**: Accept-Datetime, Memento-Datetime

#### Implementation Approach
```javascript
// src/MementoChecker.js enhancements
Zotero.MementoChecker = {
    // Major aggregators
    AGGREGATORS: {
        "TimeTravel": "https://timetravel.mementoweb.org/",
        "MemGator": "http://memgator.cs.odu.edu/"
    },
    
    // Check multiple aggregators
    async findArchivesMultiple(url) {
        const results = [];
        for (const [name, baseUrl] of Object.entries(this.AGGREGATORS)) {
            try {
                const archives = await this.findArchivesFromAggregator(baseUrl, url);
                results.push({ aggregator: name, archives });
            } catch (e) {
                // Log but continue with other aggregators
                Zotero.debug(`Memento aggregator ${name} failed: ${e}`);
            }
        }
        return this.mergeResults(results);
    }
};
```

#### Key Features to Implement
1. **Multi-aggregator support** for better coverage
2. **Caching** to reduce repeated lookups
3. **Integration with archive creation** - check before archiving
4. **TimeMap visualization** in notes

### 3. UK Web Archive Integration

#### Current Status (2024)
- **Access**: Portal-based, no public submission API found
- **Alternative**: Use Memento protocol to check if already archived
- **Implementation**: Read-only integration

```javascript
// src/UKWebArchiveChecker.js
Zotero.UKWebArchiveChecker = {
    TIMEGATE: "https://www.webarchive.org.uk/wayback/archive/",
    
    async checkIfArchived(url) {
        // UK Web Archive supports Memento protocol
        const mementoUrl = `${this.TIMEGATE}*/${url}`;
        try {
            const response = await Zotero.HTTP.request("HEAD", mementoUrl, {
                timeout: 10000
            });
            return response.status === 200;
        } catch (e) {
            return false;
        }
    }
};
```

### 4. Conifer/Rhizome Integration

#### API Status
- **Documentation**: Available but URL not fully captured
- **Architecture**: API-driven with React frontend
- **Features**: WASAPI support for bulk downloads

#### Implementation Considerations
```javascript
// src/ConiferArchiver.js (future)
Zotero.ConiferArchiver = {
    // URL-based recording API
    async startRecording(user, collection, session, url) {
        const recordUrl = `https://conifer.rhizome.org/${user}/${collection}/${session}/record/${url}`;
        // Would need authentication and session management
    }
};
```

## User Interface Updates

### Menu Structure
```
Archive this Resource →
├── Quick Archive
│   ├── Internet Archive ✓
│   ├── Archive.today ✓
│   └── Perma.cc (10 left) ← NEW
├── Check Existing Archives ← NEW
├── Create Robust Link (All)
└── Archive Settings... ← NEW
```

### Settings Dialog
```javascript
// New preferences window
Zotero.MomentO7.openSettings = function() {
    const dialog = window.openDialog(
        "chrome://zotero-moment-o7/content/settings.xul",
        "moment-o7-settings",
        "chrome,centerscreen,modal"
    );
};

// Preferences to manage
prefs = {
    "permacc.apiKey": "",
    "permacc.enabled": false,
    "permacc.defaultFolder": null,
    "memento.checkFirst": true,
    "memento.aggregator": "timetravel",
    "archive.preferredService": "internetarchive"
};
```

## Database Schema Updates

### Store Archive Metadata
```sql
-- New table for tracking archives across services
CREATE TABLE IF NOT EXISTS archiveMetadata (
    itemID INTEGER,
    service TEXT,
    archiveUrl TEXT,
    archiveDate TEXT,
    status TEXT,
    metadata TEXT,
    PRIMARY KEY (itemID, service),
    FOREIGN KEY (itemID) REFERENCES items(itemID)
);
```

## Error Handling Standards

### Service-Specific Error Messages
```javascript
const ERROR_MESSAGES = {
    permacc: {
        401: "Invalid Perma.cc API key",
        403: {
            quota: "Monthly Perma.cc quota exceeded (10 archives)",
            permission: "No permission to archive to this folder"
        },
        429: "Perma.cc rate limit - please wait",
        500: "Perma.cc service temporarily unavailable"
    },
    memento: {
        404: "No existing archives found",
        500: "Memento aggregator unavailable"
    }
};
```

## Testing Strategy

### Unit Tests
```javascript
// test/services/permacc.test.js
describe('Perma.cc Integration', () => {
    it('should validate API key format', async () => {
        const valid = await PermaCCPusher.validateApiKey('valid-key-format');
        expect(valid).toBe(true);
    });
    
    it('should handle quota exceeded gracefully', async () => {
        // Mock API response
        const response = { status: 403, message: "Quota exceeded" };
        const result = await PermaCCPusher.handleError(response);
        expect(result.userMessage).toContain('quota exceeded');
    });
});
```

### Integration Tests
1. **API Key Management**: Test storage and retrieval
2. **Quota Tracking**: Verify accurate quota reporting
3. **Error Recovery**: Test graceful degradation
4. **Multi-Service**: Test archiving to multiple services

## Performance Considerations

### Caching Strategy
```javascript
// Implement caching for expensive operations
const CacheManager = {
    cache: new Map(),
    
    async get(key, fetcher, ttl = 3600000) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.time < ttl) {
            return cached.data;
        }
        
        const data = await fetcher();
        this.cache.set(key, { data, time: Date.now() });
        return data;
    }
};
```

### Batch Operations
```javascript
// Batch archive multiple items efficiently
async batchArchive(items, services) {
    const results = new Map();
    
    // Check Memento first for all items
    if (services.includes('memento')) {
        const existing = await this.batchCheckMemento(items);
        results.set('memento', existing);
    }
    
    // Archive only items not already archived
    const toArchive = items.filter(item => 
        !results.get('memento')?.has(item.id)
    );
    
    // Archive in parallel with rate limiting
    const archivePromises = services
        .filter(s => s !== 'memento')
        .map(service => this.batchArchiveService(toArchive, service));
    
    await Promise.allSettled(archivePromises);
}
```

## Migration Path

### From Current Version
1. **Preserve existing data**: Extra field entries remain compatible
2. **Add new metadata**: Store in new database table
3. **Update UI gradually**: Add new options without removing old ones

## Documentation Updates

### User Documentation
- How to get Perma.cc API key
- Understanding quota limits
- When to use which service
- Troubleshooting common errors

### Developer Documentation
- API integration patterns
- Error handling guidelines
- Testing procedures
- Contributing new services

## Timeline

### Q1 2025
- [ ] Implement Perma.cc with full API integration
- [ ] Add settings dialog
- [ ] Create comprehensive tests

### Q2 2025
- [ ] Add Memento Protocol checking
- [ ] Implement caching layer
- [ ] Add batch operations

### Q3 2025
- [ ] Evaluate additional services
- [ ] Performance optimization
- [ ] User feedback integration

## Success Metrics

1. **Adoption**: 25% of users enable at least one additional service
2. **Reliability**: <1% error rate for API calls
3. **Performance**: <2s average time for archive checking
4. **User Satisfaction**: >4.5/5 rating for new features

## Conclusion

This implementation plan provides a roadmap for expanding Zotero Moment-o7 with additional archiving services while maintaining code quality, user experience, and performance. The phased approach allows for iterative development and user feedback integration.