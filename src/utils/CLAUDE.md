# src/utils/ - Shared Utilities

## Purpose

Common utilities used across the plugin: caching, resilience patterns, HTTP abstraction, and HTML processing.

## Files

| File | Purpose |
|------|---------|
| `Cache.ts` | LRU cache with TTL, async wrapper, memoization decorator |
| `CircuitBreaker.ts` | Circuit breaker pattern for resilience |
| `HttpClient.ts` | Clean HTTP interface wrapping Zotero.HTTP |
| `HtmlUtils.ts` | HTML escaping and safe insertion |
| `ProgressReporter.ts` | Progress tracking for long operations |

## Cache.ts

### LRU Cache with TTL

```typescript
const cache = new Cache<string>({
  maxSize: 100,           // Max entries before LRU eviction
  defaultTTL: 3600000,    // 1 hour default TTL
  cleanupInterval: 60000, // Check for expired entries every minute
  onEvict: (key, value) => console.log(`Evicted: ${key}`)
});

// Basic operations
cache.set('key', 'value');
cache.set('key', 'value', 5000);  // Custom TTL (5 seconds)
const value = cache.get('key');    // undefined if expired
const exists = cache.has('key');   // Checks expiration

// Stats
const stats = cache.getStats();
// → { size, hits, misses, evictions, hitRate }

// Cleanup
cache.delete('key');
cache.clear();
cache.destroy();  // Stops cleanup timer
```

### AsyncCache for Promises

Prevents duplicate async operations (request deduplication):

```typescript
const asyncCache = new AsyncCache<ApiResponse>({
  maxSize: 50,
  defaultTTL: 300000
});

// First call: executes fetch
const result1 = await asyncCache.get('user:123', async () => {
  return await fetchUser(123);
});

// Second call (while first pending): returns same promise
const result2 = await asyncCache.get('user:123', async () => {
  return await fetchUser(123);  // NOT called
});

// After cached: returns cached value
const result3 = await asyncCache.get('user:123', ...);

asyncCache.invalidate('user:123');  // Force refresh
```

### Memoization Decorator

```typescript
class MyClass {
  @memoize({ ttl: 60000 })
  expensiveCalculation(x: number, y: number): number {
    return x * y;  // Cached for 1 minute
  }

  @memoize({
    keyGenerator: (url) => url.hostname,  // Custom cache key
    ttl: 300000
  })
  fetchDomainInfo(url: URL): DomainInfo { ... }
}
```

## CircuitBreaker.ts

Prevents cascading failures by stopping requests to failing services:

```
CLOSED (normal) ──failures exceed threshold──> OPEN (failing)
       ↑                                           │
       └──successes exceed threshold── HALF_OPEN ←─┘ (timeout)
```

### Basic Usage

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,     // Open after 5 failures
  successThreshold: 2,     // Close after 2 successes in half-open
  timeout: 60000,          // Try half-open after 1 minute
  volumeThreshold: 10,     // Need 10 calls before evaluating
  errorFilter: (error) => error.status !== 404  // 404s don't count
});

try {
  const result = await breaker.execute(
    () => fetch(url),           // Operation
    () => getCachedFallback()   // Fallback when open
  );
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    // Service unavailable
  }
}

// Check state
const state = breaker.getState();
// → { state: 'OPEN', failures: 5, successes: 0, ... }

// Manual control
breaker.trip();   // Force open
breaker.reset();  // Force closed
```

### CircuitBreakerManager

Manages breakers per service:

```typescript
const manager = new CircuitBreakerManager();

// Auto-creates breaker per service
await manager.execute('internetarchive', () => archiveUrl(url), {
  fallback: () => null,
  breakerOptions: { failureThreshold: 3 }
});

// Check all states
const states = manager.getAllStates();  // Map<serviceId, state>

// Get available services
const available = manager.getAvailableServices();  // Not OPEN
```

## HttpClient.ts

Clean interface over Zotero.HTTP.request:

```typescript
const client = new HttpClient(30000);  // 30s default timeout

// GET request
const response = await client.get<string>(url, {
  headers: { 'Accept': 'application/json' },
  timeout: 60000
});
// → { status, statusText, data, headers }

// POST request
const response = await client.post<ApiResponse>(url, JSON.stringify(body), {
  headers: { 'Content-Type': 'application/json' },
  responseType: 'json'
});

// Generic request
const response = await client.request<string>(url, {
  method: 'PUT',
  body: '...',
  headers: { ... }
});
```

### Error Handling

Errors are enhanced with context:

```typescript
interface HttpError extends Error {
  status?: number;
  statusText?: string;
  response?: any;  // Response body
}

try {
  await client.get(url);
} catch (error: HttpError) {
  if (error.status === 429) {
    // Rate limited
  } else if (error.status >= 500) {
    // Server error
  }
}
```

## HtmlUtils.ts

Safe HTML handling:

```typescript
import { escapeHtml, createSafeLink, sanitizeHtml } from './HtmlUtils';

// Escape special characters
escapeHtml('<script>alert("xss")</script>');
// → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

// Create safe link element
const link = createSafeLink(url, displayText, {
  'data-originalurl': originalUrl,
  'data-versionurl': archiveUrl
});

// Sanitize HTML (remove dangerous elements)
const safe = sanitizeHtml(userProvidedHtml);
```

## ProgressReporter.ts

Track multi-step operation progress:

```typescript
const reporter = new ProgressReporter({
  total: items.length,
  onProgress: (current, total, message) => {
    progressWindow.update(`${current}/${total}: ${message}`);
  }
});

for (const item of items) {
  reporter.update(1, `Processing ${item.title}`);
  await processItem(item);
}

reporter.complete('Finished processing all items');
```

## Design Patterns

| Pattern | Implementation | Use Case |
|---------|----------------|----------|
| **LRU Cache** | `Cache.ts` | Avoid redundant API calls |
| **Circuit Breaker** | `CircuitBreaker.ts` | Fail fast on unhealthy services |
| **Facade** | `HttpClient.ts` | Simplify Zotero.HTTP.request |
| **Decorator** | `@memoize` | Cache method results |
| **Observer** | `ProgressReporter` | Progress callbacks |

## Gotchas

- **Cache.destroy()** - Call this on shutdown to stop cleanup timer
- **CircuitBreaker volumeThreshold** - Won't open until minimum calls reached
- **AsyncCache** - Stores the Promise, not the value; errors aren't cached
- **HttpClient** - Uses `Zotero.HTTP.request` internally, respects Zotero's proxy settings
