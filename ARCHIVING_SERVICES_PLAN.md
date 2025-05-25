# Plan for Additional Archiving Services

## Current Services Status

### 1. Internet Archive ✅
- **Error Handling**: Complete
- **Common Errors**:
  - 523: Site blocked by publisher (e.g., JSTOR)
  - 429: Rate limiting
  - 403: Access forbidden
  - 500+: Service unavailable

### 2. Archive.today ✅
- **Error Handling**: Complete via Cloudflare Worker
- **Common Errors**:
  - Rate limiting
  - Site blocking
  - Timeout issues

### 3. Signpost (ORCID) ✅
- Not an archiving service, extracts author ORCID profiles
- No error handling needed (informational only)

## Recommended New Services to Add

### 1. Perma.cc (High Priority)
**Why**: Designed specifically for academic/legal citations
**Implementation**:
```javascript
// src/PermaCC.js
Zotero.PermaCC = {
    API_URL: "https://api.perma.cc/v1/archives/",
    
    async createArchive(url, apiKey) {
        const response = await Zotero.HTTP.request("POST", this.API_URL, {
            headers: {
                "Authorization": `ApiKey ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url }),
            responseType: "json"
        });
        
        return response.response.guid; // Returns perma.cc/XXXX-XXXX
    }
};
```

**Error Handling Needed**:
- 401: Invalid API key
- 403: Quota exceeded (10/month free tier)
- 400: Invalid URL format
- 429: Rate limited

### 2. Memento Protocol (Medium Priority)
**Why**: Check if URL is already archived anywhere
**Implementation**:
```javascript
// src/MementoChecker.js
Zotero.MementoChecker = {
    TIMEGATE_URL: "https://timetravel.mementoweb.org/memento/",
    
    async findExistingArchive(url, datetime = new Date()) {
        const mementoUrl = `${this.TIMEGATE_URL}${datetime.toISOString()}/${url}`;
        const response = await Zotero.HTTP.request("HEAD", mementoUrl, {
            timeout: 10000
        });
        
        return response.getResponseHeader("Location");
    }
};
```

**Error Handling Needed**:
- 404: No mementos found
- 400: Invalid datetime format

### 3. UK Web Archive (Low Priority)
**Why**: Good for UK academic content
**Implementation**:
```javascript
// src/UKWebArchive.js
Zotero.UKWebArchive = {
    API_URL: "https://www.webarchive.org.uk/wayback/archive/",
    
    async checkArchive(url) {
        // Check if already archived
        const checkUrl = `${this.API_URL}*/${url}`;
        // Note: May need different approach for submission
    }
};
```

### 4. Conifer/Rhizome (Low Priority)
**Why**: Good for complex web apps, JavaScript-heavy sites
**Implementation**: Would require API key and more complex setup

## Implementation Priority

1. **Phase 1**: Add Perma.cc support
   - Add API key preference setting
   - Implement archive creation
   - Add quota tracking
   - Handle academic institution integration

2. **Phase 2**: Add Memento Protocol
   - Check existing archives before creating new ones
   - Reduce duplicate archiving
   - Show users existing archives

3. **Phase 3**: Regional archives
   - UK Web Archive for UK content
   - Other national archives as needed

## Error Handling Standards

All new services should follow the established pattern:

```javascript
try {
    // Archive attempt
} catch (error) {
    let errorMessage = "Archive failed";
    
    if (error.status === 401) {
        errorMessage = "Invalid API key";
    } else if (error.status === 403) {
        errorMessage = "Quota exceeded or access denied";
    } else if (error.status === 429) {
        errorMessage = "Rate limited - try again later";
    }
    // etc...
    
    this.showNotification(errorMessage, "error");
}
```

## User Interface Updates

Add new menu items:
```
Archive this Resource →
  ├── Internet Archive
  ├── Archive.today
  ├── Perma.cc (requires API key)
  ├── Check Existing Archives
  └── Create Robust Link (All Archives)
```

## Settings Required

New preferences:
- `extensions.zotero-moment-o7.permacc.apiKey`
- `extensions.zotero-moment-o7.permacc.enabled`
- `extensions.zotero-moment-o7.memento.checkFirst`
- `extensions.zotero-moment-o7.ukwebarchive.enabled`