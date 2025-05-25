# Archiving Services Quick Reference

## Currently Implemented ✅

### 1. Internet Archive
- **API**: `https://web.archive.org/save/{url}`
- **Method**: GET
- **Auth**: None
- **Limits**: Rate limiting (429) when excessive
- **Returns**: Archived URL in headers/response

### 2. Archive.today
- **API**: Via Cloudflare Worker proxy
- **Proxy**: `https://zotero-archive-proxy.2pc9prprn5.workers.dev/`
- **Method**: GET with `?url={url}`
- **Auth**: None
- **Limits**: Rate limiting, anti-automation
- **Returns**: JSON with archived URL

## Ready to Implement 🚧

### 3. Perma.cc
- **API**: `https://api.perma.cc/v1/`
- **Method**: POST to `/archives/`
- **Auth**: API Key required (`Authorization: ApiKey XXX`)
- **Limits**: 10/month free, more with subscription
- **Returns**: JSON with GUID and archive details
- **Get API Key**: https://perma.cc/settings/tools

### 4. Memento Protocol
- **API**: `https://timetravel.mementoweb.org/`
- **Method**: GET
- **Auth**: None
- **Endpoints**:
  - TimeGate: `/timegate/{url}`
  - TimeMap: `/timemap/json/{url}`
- **Returns**: Existing archives from multiple sources

## Potential Future Services 🔮

### 5. UK Web Archive
- **Access**: Limited, mainly read-only via Memento
- **TimeGate**: `https://www.webarchive.org.uk/wayback/archive/`
- **Submission**: No public API

### 6. Conifer (Rhizome)
- **Status**: Has API but needs authentication
- **Features**: Good for complex web apps
- **URL**: `https://conifer.rhizome.org/`

### 7. Archive-It
- **Access**: Subscription service by Internet Archive
- **API**: Available for subscribers only
- **Use Case**: Institutional archiving

## Quick Implementation Guide

### Adding a New Service

1. **Create Service Module**
```javascript
// src/ServiceNamePusher.js
Zotero.ServiceNamePusher = {
    API_URL: "https://api.example.com/",
    
    async archive(url) {
        // Implementation
    }
};
```

2. **Add to Main Plugin**
```javascript
// src/zotero-moment-o7.js
Services.scriptloader.loadSubScript(rootURI + "src/ServiceNamePusher.js");
```

3. **Add Menu Item**
```javascript
const menuItem = doc.createXULElement("menuitem");
menuItem.setAttribute("label", "Service Name");
menuItem.addEventListener("command", async () => {
    await Zotero.ServiceNamePusher.archiveSelected();
});
```

4. **Handle Errors**
```javascript
const ERROR_MAP = {
    401: "Authentication required",
    403: "Access denied",
    429: "Rate limited",
    503: "Service unavailable"
};
```

## Service Comparison

| Service | Free Limit | API Key | Best For |
|---------|------------|---------|----------|
| Internet Archive | Unlimited* | No | General web |
| Archive.today | Unlimited* | No | Sites that block IA |
| Perma.cc | 10/month | Yes | Academic citations |
| Memento | Read-only | No | Finding existing archives |

*Subject to rate limiting

## Authentication Methods

### API Key in Header
```javascript
headers: {
    "Authorization": "ApiKey YOUR_KEY"  // Perma.cc
    "Authorization": "Bearer YOUR_KEY"  // OAuth services
}
```

### API Key in URL
```javascript
`${API_URL}?api_key=${key}`  // Deprecated but sometimes used
```

### Session-Based
```javascript
// Login first, maintain cookies
const session = await login(username, password);
```

## Rate Limiting Strategies

### 1. Exponential Backoff
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 429 && i < maxRetries - 1) {
                await delay(Math.pow(2, i) * 1000);
                continue;
            }
            throw error;
        }
    }
}
```

### 2. Queue Management
```javascript
class RateLimiter {
    constructor(maxPerMinute) {
        this.queue = [];
        this.processing = false;
        this.delay = 60000 / maxPerMinute;
    }
    
    async add(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }
}
```

### 3. Quota Tracking
```javascript
const quotaManager = {
    used: 0,
    limit: 10,
    resetDate: new Date(),
    
    canArchive() {
        this.checkReset();
        return this.used < this.limit;
    },
    
    checkReset() {
        const now = new Date();
        if (now.getMonth() !== this.resetDate.getMonth()) {
            this.used = 0;
            this.resetDate = now;
        }
    }
};
```

## Testing Endpoints

### Health Checks
- Internet Archive: `https://web.archive.org/` (200 = healthy)
- Perma.cc: `https://api.perma.cc/v1/` (requires auth)
- TimeTravel: `https://timetravel.mementoweb.org/` (200 = healthy)

### Test URLs
- Simple: `https://example.com`
- Dynamic: `https://httpbin.org/uuid`
- Large: `https://www.wikipedia.org`
- Problematic: `https://www.jstor.org` (often blocked)