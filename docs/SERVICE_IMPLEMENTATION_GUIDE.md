# Service Implementation Guide

## Current Implementation Status

### ✅ Plugin-Based Services (No Worker Needed)

#### 1. Internet Archive
- **Location**: `src/IaPusher.js`
- **Why Plugin**: Supports CORS, no proxy needed
- **Implementation**: Direct HTTP requests

#### 2. Memento Protocol
- **Location**: `src/MementoChecker.js`
- **Why Plugin**: Read-only queries, CORS-friendly
- **Implementation**: Direct HTTP requests to aggregators

### 🔄 Proxy-Based Services (Worker Required)

#### 1. Archive.today
- **Plugin**: `src/ArchiveTodayPusher.js`
- **Worker**: `cloudflare-worker/archive-proxy.js`
- **Why Worker**: Blocks CORS, requires form submission
- **Implementation**: Plugin → Worker → Archive.today

## Service-by-Service Implementation

### 📦 Perma.cc (To Be Implemented)

**Initial Test for CORS Support**:
```javascript
// Test if Perma.cc supports CORS
async function testPermaCCCors() {
    try {
        const response = await fetch('https://api.perma.cc/v1/user/', {
            method: 'OPTIONS',
            headers: {
                'Origin': 'moz-extension://...',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization'
            }
        });
        
        const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
        return allowOrigin === '*' || allowOrigin.includes('moz-extension');
    } catch {
        return false;
    }
}
```

**If CORS Supported** → Plugin Only:
```javascript
// src/PermaCCPusher.js
Zotero.PermaCCPusher = {
    async createArchive(url) {
        return await Zotero.HTTP.request('POST', 
            'https://api.perma.cc/v1/archives/',
            {
                headers: {
                    'Authorization': `ApiKey ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            }
        );
    }
};
```

**If CORS Blocked** → Add Worker Route:
```javascript
// cloudflare-worker/src/services/permacc.js
export async function handlePermaCC(request, env) {
    const { url, apiKey } = await request.json();
    
    // Never log API keys!
    const response = await fetch('https://api.perma.cc/v1/archives/', {
        method: 'POST',
        headers: {
            'Authorization': `ApiKey ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    });
    
    return new Response(response.body, {
        status: response.status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}
```

### 🌐 UK Web Archive

**Implementation**: Plugin only (Memento-compliant)
```javascript
// src/UKWebArchiveChecker.js
Zotero.UKWebArchiveChecker = {
    TIMEGATE: 'https://www.webarchive.org.uk/wayback/archive/',
    
    // Read-only - check if archived
    async checkArchived(url) {
        const mementoUrl = `${this.TIMEGATE}*/${url}`;
        const response = await Zotero.HTTP.request('HEAD', mementoUrl, {
            timeout: 10000,
            successCodes: [200, 302]
        });
        return response.status === 200 || response.status === 302;
    }
};
```

### 🎯 Conifer/Rhizome

**Likely Needs Worker** (session-based):
```javascript
// cloudflare-worker/src/services/conifer.js
export async function handleConifer(request, env) {
    const { url, sessionId } = await request.json();
    
    // Would need to handle:
    // 1. Session creation/management
    // 2. Recording initiation
    // 3. Status checking
    // Complex implementation - consider if worth it
}
```

## Quick Decision Tree

```
For each new service:
│
├─ Does it support CORS?
│  │
│  ├─ YES → Implement in Plugin only
│  │   └─ Use Zotero.HTTP.request()
│  │
│  └─ NO → Needs Cloudflare Worker
│      │
│      ├─ Simple API? → Basic proxy
│      │
│      └─ Complex? (sessions, forms)
│          └─ Full implementation in Worker
```

## Testing CORS Support

```javascript
// Universal CORS test function
async function testCorsSupport(serviceUrl) {
    console.log(`Testing CORS for ${serviceUrl}...`);
    
    // Test 1: Preflight
    try {
        const preflight = await fetch(serviceUrl, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'moz-extension://test',
                'Access-Control-Request-Method': 'POST'
            }
        });
        
        console.log('CORS headers:', {
            allowOrigin: preflight.headers.get('Access-Control-Allow-Origin'),
            allowMethods: preflight.headers.get('Access-Control-Allow-Methods'),
            allowHeaders: preflight.headers.get('Access-Control-Allow-Headers')
        });
    } catch (e) {
        console.log('Preflight failed:', e.message);
    }
    
    // Test 2: Actual request
    try {
        const response = await fetch(serviceUrl, {
            method: 'GET',
            headers: {
                'Origin': 'moz-extension://test'
            }
        });
        
        console.log('Direct request:', response.status);
        return true;
    } catch (e) {
        console.log('Direct request failed:', e.message);
        return false;
    }
}

// Run tests
testCorsSupport('https://web.archive.org/save/');     // Should work
testCorsSupport('https://archive.today/');            // Should fail
testCorsSupport('https://api.perma.cc/v1/');         // Test needed
```

## Worker Endpoint Structure

```javascript
// Proposed worker routes
const routes = {
    // Current
    '/': handleArchiveToday,  // Legacy
    
    // Proposed structure
    '/v1/archive-today': handleArchiveToday,
    '/v1/permacc': handlePermaCC,         // If needed
    '/v1/conifer': handleConifer,         // If needed
    '/v1/health': handleHealthCheck,
    
    // Utility endpoints
    '/v1/test-cors': handleCorsTest,
    '/v1/proxy': handleGenericProxy       // For testing
};
```

## Security Guidelines

### Plugin Side
1. **Never send sensitive data to worker unless necessary**
2. **Validate all responses from worker**
3. **Implement timeout handling**
4. **Log errors but not sensitive data**

### Worker Side
1. **Validate all incoming requests**
2. **Never log API keys or passwords**
3. **Implement rate limiting**
4. **Use environment variables for secrets**

```javascript
// Good practice
export default {
    async fetch(request, env) {
        // Validate origin
        const origin = request.headers.get('Origin');
        if (!isAllowedOrigin(origin)) {
            return new Response('Forbidden', { status: 403 });
        }
        
        // Rate limit by IP
        const ip = request.headers.get('CF-Connecting-IP');
        if (await isRateLimited(ip, env)) {
            return new Response('Rate limited', { status: 429 });
        }
        
        // Process request...
    }
};
```

## Performance Considerations

### Plugin Optimizations
```javascript
// Batch operations when possible
async function batchArchive(items) {
    // Group by service
    const byService = groupItemsByService(items);
    
    // Execute in parallel
    const results = await Promise.allSettled([
        ...byService.ia.map(item => IaPusher.archive(item)),
        ...byService.proxy.map(item => ProxyArchiver.archive(item))
    ]);
    
    return processResults(results);
}
```

### Worker Optimizations
```javascript
// Use Cloudflare's cache
async function cachedFetch(url, options, ttl = 3600) {
    const cache = caches.default;
    const cacheKey = new Request(url, options);
    
    // Try cache first
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    
    // Fetch and cache
    const response = await fetch(url, options);
    const responseToCache = response.clone();
    
    // Cache successful responses
    if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', `public, max-age=${ttl}`);
        
        await cache.put(cacheKey, new Response(responseToCache.body, {
            status: response.status,
            headers
        }));
    }
    
    return response;
}
```

## Implementation Checklist

For each new service:

- [ ] Test CORS support
- [ ] Decide: Plugin only or needs Worker?
- [ ] Implement service module
- [ ] Add error handling
- [ ] Create tests
- [ ] Add to menu system
- [ ] Document API requirements
- [ ] Update user guide

## Summary

**Most services should be plugin-only**. Only use the Cloudflare Worker when:
1. Service blocks CORS
2. Complex session management needed
3. Request transformation required
4. IP rotation beneficial

This keeps the architecture simple and reduces latency by avoiding unnecessary proxy hops.