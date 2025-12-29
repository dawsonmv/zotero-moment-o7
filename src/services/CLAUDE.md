# src/services/ - Archive Service Layer

## Purpose

This directory contains the archive service implementations using a **Strategy + Template Method** pattern. Each service extends `BaseArchiveService` which handles common concerns while services implement only `archiveUrl()`.

## Architecture

```
types.ts                    # Interfaces: ArchiveService, ArchiveResult, ArchiveError
    ↑
BaseArchiveService.ts       # Template method: archive() orchestrates workflow
    ↑
├── InternetArchiveService  # web.archive.org/save/{url}
├── ArchiveTodayService     # archive.today via Cloudflare proxy
├── PermaCCService          # perma.cc API (requires API key)
├── UKWebArchiveService     # webarchive.org.uk (UK domains only)
└── ArquivoPtService        # arquivo.pt

ServiceRegistry.ts          # Singleton managing service instances
ArchiveCoordinator.ts       # Orchestrates fallback + memento checks
```

## Key Types (types.ts)

```typescript
interface ArchiveService {
  readonly name: string;     // Display name
  readonly id: string;       // Internal ID (e.g., "internetarchive")
  isAvailable(): Promise<boolean>;
  archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;
}

interface SingleArchiveResult {
  success: boolean;
  url?: string;              // Archived URL on success
  error?: string;            // Error message on failure
  metadata?: { ... };
}

class ArchiveError extends Error {
  type: ArchiveErrorType;    // RateLimit, Blocked, Timeout, etc.
  statusCode?: number;
  retryAfter?: number;
}
```

## BaseArchiveService (Template Method)

```typescript
abstract class BaseArchiveService {
  // Template method - orchestrates the workflow
  async archive(items: Item[]): Promise<ArchiveResult[]> {
    const progress = this.createProgressWindow();
    for (const item of items) {
      const url = this.getBestUrl(item);      // DOI preferred
      if (this.checkValidUrl(url)) {
        const result = await this.archiveUrl(url);  // <-- subclass implements
        await this.saveToItem(item, result.url);    // Extra field + note
      }
    }
  }

  // Subclasses MUST implement
  abstract archiveUrl(url: string): Promise<SingleArchiveResult>;
  abstract isAvailable(): Promise<boolean>;

  // Inherited helpers
  protected getBestUrl(item): string;           // DOI → doi.org, else URL field
  protected checkValidUrl(url): boolean;        // Validates http(s)://
  protected makeHttpRequest(...): Promise<...>; // Wrapped Zotero.HTTP.request
  protected saveToItem(item, url): Promise<void>; // Updates Extra + creates note
  protected mapHttpError(error): ArchiveError;  // Maps status codes to types
}
```

## Adding a New Service

1. **Create service file:**
```typescript
// src/services/NewArchiveService.ts
import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';

export class NewArchiveService extends BaseArchiveService {
  constructor() {
    super({
      name: 'New Archive',
      id: 'newarchive',
      homepage: 'https://newarchive.org',
      capabilities: { acceptsUrl: true, returnsUrl: true }
    });
  }

  async isAvailable(): Promise<boolean> {
    return true; // Or check API key, domain restrictions, etc.
  }

  protected async archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult> {
    progress?.onStatusUpdate(`Submitting to New Archive...`);

    const response = await Zotero.HTTP.request('POST', 'https://api.newarchive.org/save', {
      body: JSON.stringify({ url }),
      timeout: 60000
    });

    return {
      success: true,
      url: response.responseJSON.archived_url
    };
  }
}
```

2. **Register in MomentO7.ts:**
```typescript
registry.register('newarchive', new NewArchiveService());
```

3. **Update preferences defaults:**
```typescript
// PreferencesManager.ts
fallbackOrder: ['internetarchive', ..., 'newarchive']
```

## ServiceRegistry

Singleton managing service instances:

```typescript
const registry = ServiceRegistry.getInstance();
registry.init();
registry.register('myservice', new MyService());

const service = registry.get('internetarchive');
const available = await registry.getAvailable();  // Filters by isAvailable()
```

## ArchiveCoordinator

Orchestrates multi-service archiving:

```typescript
const coordinator = ArchiveCoordinator.getInstance();

// Single service
const results = await coordinator.archiveItems(items, 'internetarchive');

// Fallback through preferences order
const results = await coordinator.archiveItems(items);  // No serviceId

// Auto-archive (on new item)
await coordinator.autoArchive(item);  // Uses default service
```

**Fallback logic:**
1. Get fallback order from `PreferencesManager`
2. Sort available services by fallback order
3. Try each until success
4. Collect errors from all failures

## Service-Specific Notes

| Service | URL Restrictions | Auth | Special Handling |
|---------|------------------|------|------------------|
| InternetArchive | None | No | Retry on timeout, exponential backoff |
| ArchiveToday | None | No | Uses Cloudflare Worker proxy |
| PermaCCService | None | API Key | 10/month free tier |
| UKWebArchive | `.uk` domains only | No | Nomination system |
| ArquivoPtService | None | No | Portuguese Web Archive |

## Error Handling

Services throw `ArchiveError` with typed reasons:

```typescript
catch (error) {
  const archiveError = this.mapHttpError(error);

  switch (archiveError.type) {
    case ArchiveErrorType.RateLimit:
      // Wait and retry
    case ArchiveErrorType.Blocked:
      // Publisher blocks archiving (e.g., 523)
    case ArchiveErrorType.AuthRequired:
      // API key needed
    case ArchiveErrorType.Timeout:
      // Increase timeout, retry
  }
}
```

## Gotchas

- **BaseArchiveService.getBestUrl()** prefers DOI over URL field
- **saveToItem()** appends to Extra field, doesn't overwrite
- **checkRateLimit()** uses 1 second minimum between requests
- **createProgressWindow()** returns a wrapper that auto-closes on error
