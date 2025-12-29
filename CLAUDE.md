# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero Moment-o7 is a Zotero 7 plugin that prevents link rot by automatically archiving web resources to multiple archive services. Stores archival URLs in item metadata and creates Robust Links.

## Architecture

### Design Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Singleton** | ServiceRegistry, PreferencesManager, all monitoring classes | Single instance management |
| **Strategy** | Archive services extending BaseArchiveService | Interchangeable archive backends |
| **Template Method** | BaseArchiveService.archive() | Common workflow with customizable steps |
| **Observer** | Zotero.Notifier for auto-archiving | React to new items |
| **Circuit Breaker** | CircuitBreaker, CircuitBreakerManager | Prevent cascading failures |
| **Registry** | ServiceRegistry | Dynamic service registration |

### Module Dependency Graph

```
bootstrap.ts (entry)
    └── MomentO7.ts (plugin core)
        ├── services/ServiceRegistry.ts (singleton)
        │   └── services/*Service.ts (archive backends)
        │       └── services/BaseArchiveService.ts (abstract)
        ├── services/ArchiveCoordinator.ts (orchestration)
        │   └── memento/MementoChecker.ts
        │       └── memento/MementoProtocol.ts (RFC 7089)
        ├── preferences/PreferencesManager.ts
        └── monitoring/* (observability stack)
```

### Directory Structure

```
src/
├── MomentO7.ts          # Main plugin class, window mgmt, menu creation
├── Signpost.ts          # ORCID extraction via Signposting protocol
├── RobustLinkCreator.ts # Multi-archive robust links
├── services/            # Archive service implementations
│   ├── types.ts         # Shared interfaces (ArchiveService, ArchiveResult)
│   ├── ServiceRegistry.ts
│   ├── ArchiveCoordinator.ts
│   ├── BaseArchiveService.ts  # Template method pattern
│   ├── InternetArchiveService.ts
│   ├── ArchiveTodayService.ts
│   ├── PermaCCService.ts
│   ├── UKWebArchiveService.ts
│   └── ArquivoPtService.ts
├── memento/             # RFC 7089 Memento Protocol
│   ├── MementoProtocol.ts    # Link header parsing, TimeMap
│   └── MementoChecker.ts     # Existing archive lookup
├── preferences/         # User settings
│   └── PreferencesManager.ts
├── utils/               # Shared utilities
│   ├── Cache.ts         # LRU cache with TTL
│   ├── CircuitBreaker.ts
│   ├── HttpClient.ts
│   ├── HtmlUtils.ts
│   └── ProgressReporter.ts
├── monitoring/          # Observability (local-first)
│   ├── types.ts         # LogEntry, MetricEntry, Alert types
│   ├── Logger.ts        # Structured logging (RFC 5424 levels)
│   ├── Metrics.ts       # Counters, gauges, histograms
│   ├── Tracer.ts        # Distributed tracing
│   ├── HealthChecker.ts # Service health monitoring
│   ├── Alerting.ts      # Local alerting system
│   ├── Dashboard.ts     # Aggregated reporting
│   └── index.ts         # Public API
├── webapi/              # External API clients
│   └── WebAPIClient.ts
├── translators/         # Zotero export translators
│   ├── BibLaTex.js
│   ├── Bookmarks.js
│   ├── HtmlSnippet.js
│   ├── MlaWithArchived.js
│   └── WikipediaCitationTemplate.js
└── types/               # TypeScript declarations
    ├── zotero.d.ts
    └── zotero-web-api.d.ts
```

## Key Interfaces

```typescript
// Core service contract
interface ArchiveService {
  readonly name: string;
  readonly id: string;
  isAvailable(): Promise<boolean>;
  archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;
}

// Operation result
interface ArchiveResult {
  item: Zotero.Item;
  success: boolean;
  archivedUrl?: string;
  error?: string;
  service?: string;
}

// Typed errors
enum ArchiveErrorType {
  RateLimit, AuthRequired, Blocked, NotFound,
  ServerError, Timeout, InvalidUrl, Unknown
}
```

## Implementation Guidelines

### Adding a New Archive Service

1. Create `src/services/YourService.ts` extending `BaseArchiveService`
2. Implement `isAvailable()` and `archiveUrl()`
3. Register in `MomentO7.initializeServices()`
4. Add to fallback order in `PreferencesManager.defaults`

### Key Abstractions

- **BaseArchiveService**: Handles progress windows, URL validation, metadata saving, error mapping. Subclasses only implement `archiveUrl()`.
- **MementoProtocol**: Stateless utility for RFC 7089 Link header parsing. Use `parseLinkHeader()`, `parseTimeMap()`, `findBestMemento()`.
- **Cache<T>**: Generic LRU cache. Use `AsyncCache` for caching promises.
- **CircuitBreaker**: Wrap external calls with `execute(operation, fallback)`.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Services | `*Service.ts` | `InternetArchiveService.ts` |
| Legacy pushers | `*Pusher.js` | `IaPusher.js` (deprecated) |
| Types | Interface in `types.ts` | `ArchiveResult` |
| Preferences | `extensions.momento7.*` | `extensions.momento7.autoArchive` |
| Tags | `archived:*` | `archived:internetarchive` |

### Non-Obvious Behaviors

1. **Archive.today uses Cloudflare Worker** - Direct requests blocked by CORS. Proxy at `cloudflare-worker/archive-proxy.js`.
2. **Robust Links format** - `<a href="..." data-originalurl="..." data-versionurl="..." data-versiondate="...">`.
3. **Extra field format** - `{serviceId}Archived: {url}` appended to existing content.
4. **Preferences stored** - Via `Zotero.Prefs` with `extensions.momento7.` prefix.
5. **Rate limiting** - 1 second minimum between requests per service.

## Build & Development

```bash
npm run build        # TypeScript + package
npm run type-check   # TSC validation only
npm test             # Jest unit tests
npm run lint         # ESLint
```

### Testing in Zotero

1. Build plugin: `npm run build`
2. Install XPI from `build/` directory
3. Debug via: Tools → Developer → Error Console
4. Access internals: `Zotero.MomentO7` in console

## Gotchas

- **Zotero.HTTP.request** is async but not Promise-native in all contexts
- **ProgressWindow** must be closed manually or via timer
- **Notifier callbacks** run for ALL item types - filter by `type === 'item'`
- **WeakMap for window data** prevents memory leaks on window close
- **CircuitBreaker** needs volume threshold before opening
