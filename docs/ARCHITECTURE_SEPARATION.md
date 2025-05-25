# Architecture Separation: Zotero Plugin vs Cloudflare Worker

## Overview

The Zotero plugin runs in a privileged XUL/XPCOM environment with full network access but no server-side capabilities. The Cloudflare Worker runs on edge servers with CORS-free network access but stateless execution.

## Component Distribution

### 🔌 Zotero Plugin Components

#### 1. **Core Plugin Logic**
```javascript
// src/zotero-moment-o7.js
- Plugin lifecycle management
- Window/UI management
- Menu creation and event handlers
- Notifier registration
- Module loading
```

#### 2. **Direct Archive Services** (No CORS issues)
```javascript
// src/IaPusher.js
- Internet Archive (web.archive.org allows CORS)
- Direct HTTP requests via Zotero.HTTP

// src/MementoChecker.js
- Memento Protocol queries (read-only, CORS-friendly)
- TimeGate/TimeMap requests
- Archive discovery

// src/PermaCCPusher.js
- Perma.cc API calls (when they support CORS)
- API key management
- Local quota tracking
```

#### 3. **Data Management**
```javascript
// All service modules
- Item metadata updates (Extra field)
- Note creation and formatting
- Tag management
- Attachment creation
- User preferences/settings
```

#### 4. **UI Components**
```javascript
- Progress windows
- Error notifications
- Settings dialogs
- Menu items
- User prompts
```

#### 5. **Local Processing**
```javascript
// src/RobustLinkCreator.js
- HTML generation
- Combining results from multiple services
- Creating local attachments
- Formatting export data
```

### ☁️ Cloudflare Worker Components

#### 1. **CORS Proxy Services**
```javascript
// cloudflare-worker/archive-proxy.js
- Archive.today requests (blocks CORS)
- Any service that doesn't allow cross-origin requests
```

#### 2. **Request Transformation**
```javascript
// Current implementation
- Form submission handling
- Cookie/session management
- Header manipulation
- Following redirects
```

#### 3. **Future Services That Need Proxying**
```javascript
// Potential additions
- Services requiring server-side sessions
- APIs with IP-based rate limiting
- Services needing request signing
- WebSocket to HTTP bridges
```

## Decision Matrix

| Feature | Plugin | Worker | Reason |
|---------|--------|--------|---------|
| Internet Archive | ✅ | ❌ | Supports CORS |
| Archive.today | ❌ | ✅ | Blocks CORS |
| Perma.cc | ✅ | ❓ | Check CORS support |
| Memento Protocol | ✅ | ❌ | Read-only, CORS-friendly |
| UK Web Archive | ✅ | ❌ | Memento-compliant |
| Settings Storage | ✅ | ❌ | Local to Zotero |
| API Key Management | ✅ | ❌ | Security |
| Rate Limiting | ✅ | 🔄 | Local tracking + server enforcement |
| Request Signing | ❌ | ✅ | Server-side only |
| Session Management | ❌ | ✅ | Server-side only |

## Implementation Patterns

### Pattern 1: Direct API Access (Plugin Only)
```javascript
// When service supports CORS
class DirectArchiver {
    async archive(url) {
        const response = await Zotero.HTTP.request('POST', 
            'https://api.example.com/archive',
            {
                headers: {
                    'Authorization': 'Bearer ' + this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            }
        );
        return response.response;
    }
}
```

### Pattern 2: Proxy Pattern (Plugin + Worker)
```javascript
// Plugin side
class ProxiedArchiver {
    async archive(url) {
        const response = await Zotero.HTTP.request('POST',
            'https://my-worker.workers.dev/archive',
            {
                body: JSON.stringify({ 
                    url,
                    service: 'archive.today'
                })
            }
        );
        return response.response;
    }
}

// Worker side
export default {
    async fetch(request) {
        const { url, service } = await request.json();
        
        if (service === 'archive.today') {
            // Handle CORS-blocked service
            return handleArchiveToday(url);
        }
        
        // Add more services as needed
    }
}
```

### Pattern 3: Hybrid Approach
```javascript
// Plugin determines strategy
class SmartArchiver {
    async archive(url) {
        // Try direct first
        if (await this.canAccessDirectly()) {
            return this.archiveDirect(url);
        }
        
        // Fall back to proxy
        return this.archiveViaProxy(url);
    }
    
    async canAccessDirectly() {
        // Test CORS with OPTIONS request
        try {
            await Zotero.HTTP.request('OPTIONS', this.apiUrl);
            return true;
        } catch {
            return false;
        }
    }
}
```

## Cloudflare Worker Architecture

### Current Structure
```
cloudflare-worker/
├── archive-proxy.js      # Main worker
├── wrangler.toml        # Config
└── package.json         # Dependencies
```

### Proposed Enhanced Structure
```
cloudflare-worker/
├── src/
│   ├── index.js         # Main entry point
│   ├── services/
│   │   ├── archive-today.js
│   │   ├── conifer.js
│   │   └── [other-proxy-services].js
│   ├── middleware/
│   │   ├── cors.js
│   │   ├── rate-limit.js
│   │   └── auth.js
│   └── utils/
│       ├── http.js
│       └── parse.js
├── wrangler.toml
└── package.json
```

### Enhanced Worker Implementation
```javascript
// cloudflare-worker/src/index.js
import { handleArchiveToday } from './services/archive-today.js';
import { handleConifer } from './services/conifer.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';

export default {
    async fetch(request, env, ctx) {
        // Apply middleware
        const corsHeaders = corsMiddleware(request);
        
        // Rate limiting
        const rateLimitOk = await rateLimitMiddleware(request, env);
        if (!rateLimitOk) {
            return new Response('Rate limited', { 
                status: 429,
                headers: corsHeaders 
            });
        }
        
        // Route to appropriate handler
        const url = new URL(request.url);
        const path = url.pathname;
        
        try {
            switch (path) {
                case '/archive-today':
                    return handleArchiveToday(request, env, corsHeaders);
                case '/conifer':
                    return handleConifer(request, env, corsHeaders);
                default:
                    return new Response('Not found', { 
                        status: 404,
                        headers: corsHeaders 
                    });
            }
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};
```

## Security Considerations

### Plugin Side
```javascript
// Store sensitive data in Zotero preferences
Zotero.Prefs.set('extensions.zotero-moment-o7.apiKeys', JSON.stringify({
    permacc: 'encrypted-key',
    // Never send API keys to worker
}));
```

### Worker Side
```javascript
// Use environment variables for worker-specific secrets
export default {
    async fetch(request, env) {
        // Access secrets from env
        const workerApiKey = env.WORKER_API_KEY;
        // Never expose these to client
    }
}
```

## Performance Optimization

### Plugin Side
1. **Parallel Requests**
```javascript
// Execute multiple archives simultaneously
const results = await Promise.allSettled([
    this.archiveToIA(url),
    this.archiveViaProxy(url),
    this.checkMemento(url)
]);
```

2. **Caching**
```javascript
// Cache Memento lookups
const mementoCache = new Map();
const CACHE_TTL = 3600000; // 1 hour
```

### Worker Side
1. **Edge Caching**
```javascript
// Use Cloudflare's cache API
const cache = caches.default;
const cacheKey = new Request(url, { method: 'GET' });
const cached = await cache.match(cacheKey);
```

2. **Request Coalescing**
```javascript
// Prevent duplicate simultaneous requests
const inFlight = new Map();

async function coalesceRequests(key, fn) {
    if (inFlight.has(key)) {
        return inFlight.get(key);
    }
    
    const promise = fn();
    inFlight.set(key, promise);
    
    try {
        return await promise;
    } finally {
        inFlight.delete(key);
    }
}
```

## Migration Strategy

### Phase 1: Current State
- Archive.today via simple proxy
- All other logic in plugin

### Phase 2: Service Abstraction
- Create service interface in plugin
- Move service-specific logic to modules
- Standardize proxy communication

### Phase 3: Enhanced Worker
- Implement multi-service router
- Add middleware support
- Deploy versioned endpoints

### Phase 4: Smart Routing
- Plugin tests CORS support
- Automatic fallback to proxy
- Performance monitoring

## Testing Strategy

### Plugin Tests
```javascript
// Test direct API access
describe('Direct Archiver', () => {
    it('should archive to Internet Archive', async () => {
        const result = await IaPusher.archive('https://example.com');
        expect(result).toHaveProperty('archivedUrl');
    });
});
```

### Worker Tests
```javascript
// Test proxy functionality
describe('Archive Proxy', () => {
    it('should handle Archive.today', async () => {
        const response = await fetch('https://worker.dev/archive-today', {
            method: 'POST',
            body: JSON.stringify({ url: 'https://example.com' })
        });
        expect(response.ok).toBe(true);
    });
});
```

### Integration Tests
```javascript
// Test full flow
describe('Full Archive Flow', () => {
    it('should archive via best available method', async () => {
        const archiver = new SmartArchiver();
        const result = await archiver.archive('https://example.com');
        expect(result.method).toMatch(/direct|proxy/);
    });
});
```

## Recommendations

1. **Keep in Plugin**:
   - All services that support CORS
   - User interface and preferences
   - Data management and storage
   - Service orchestration

2. **Move to Worker**:
   - CORS-blocked services only
   - Request transformation needs
   - Server-side session handling
   - IP rotation requirements

3. **Future Considerations**:
   - Monitor CORS policies of services
   - Build abstraction layer for easy migration
   - Consider WebAssembly for compute-heavy tasks
   - Implement service health monitoring