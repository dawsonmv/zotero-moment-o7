# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero Moment-o7 is a Zotero 7 plugin that prevents link rot by automatically archiving web resources to multiple archive services. Stores archival URLs in item metadata and creates Robust Links.

## Build & Development

```bash
npm install         # Install dependencies
npm start           # Development with hot reload
npm run build       # Production build
npm test            # Jest unit tests
npm run test:coverage  # Tests with coverage
npm run lint:check  # ESLint + Prettier
npm run lint:fix    # Auto-fix lint issues
npm run release     # Create release
```

## Architecture

### Design Patterns

| Pattern             | Location                                                    | Purpose                                 |
| ------------------- | ----------------------------------------------------------- | --------------------------------------- |
| **Singleton**       | ServiceRegistry, PreferencesManager, all monitoring classes | Single instance management              |
| **Strategy**        | Archive services extending BaseArchiveService               | Interchangeable archive backends        |
| **Template Method** | BaseArchiveService.archive()                                | Common workflow with customizable steps |
| **Observer**        | Zotero.Notifier for auto-archiving                          | React to new items                      |
| **Circuit Breaker** | CircuitBreaker, CircuitBreakerManager                       | Prevent cascading failures              |
| **Registry**        | ServiceRegistry                                             | Dynamic service registration            |

### Directory Structure

```
src/
├── index.ts              # Entry point
├── addon.ts              # Addon class
├── hooks.ts              # Lifecycle hooks
├── modules/
│   ├── archive/          # Archive service implementations
│   │   ├── types.ts      # Shared interfaces
│   │   ├── BaseArchiveService.ts
│   │   ├── InternetArchiveService.ts
│   │   ├── ArchiveTodayService.ts
│   │   ├── PermaCCService.ts
│   │   ├── UKWebArchiveService.ts
│   │   ├── ArquivoPtService.ts
│   │   ├── ServiceRegistry.ts
│   │   ├── ArchiveCoordinator.ts
│   │   ├── RobustLinkCreator.ts
│   │   └── ZoteroItemHandler.ts
│   ├── memento/          # RFC 7089 Memento Protocol
│   │   ├── MementoProtocol.ts
│   │   └── MementoChecker.ts
│   ├── monitoring/       # Observability stack
│   │   ├── types.ts
│   │   ├── Logger.ts
│   │   ├── Metrics.ts
│   │   ├── Tracer.ts
│   │   ├── HealthChecker.ts
│   │   ├── Alerting.ts
│   │   └── Dashboard.ts
│   └── preferences/
│       └── PreferencesManager.ts
├── utils/
│   ├── Cache.ts
│   ├── CircuitBreaker.ts
│   ├── CredentialManager.ts
│   ├── HtmlUtils.ts
│   ├── HttpClient.ts
│   └── ProgressReporter.ts
└── types/
    └── global.d.ts

addon/                    # Static addon files
├── bootstrap.js
├── manifest.json
├── prefs.js
├── content/
│   └── preferences.xhtml
└── locale/
    └── en-US/
        └── addon.ftl

tests/                    # Jest unit tests (644 tests, 88% coverage)
├── archive/
├── memento/
├── monitoring/
├── preferences/
└── utils/
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
  RateLimit,
  AuthRequired,
  Blocked,
  NotFound,
  ServerError,
  Timeout,
  InvalidUrl,
  Unknown,
}
```

## Implementation Guidelines

### Adding a New Archive Service

1. Create `src/modules/archive/YourService.ts` extending `BaseArchiveService`
2. Implement `isAvailable()` and `archiveUrl()`
3. Register in `ServiceRegistry` initialization
4. Add to fallback order in `PreferencesManager.defaults`

### Key Abstractions

- **BaseArchiveService**: Handles progress windows, URL validation, metadata saving, error mapping. Subclasses only implement `archiveUrl()`.
- **MementoProtocol**: Stateless utility for RFC 7089 Link header parsing. Use `parseLinkHeader()`, `parseTimeMap()`, `findBestMemento()`.
- **Cache<T>**: Generic LRU cache with TTL.
- **CircuitBreaker**: Wrap external calls with `execute(operation, fallback)`.

### Naming Conventions

| Type        | Convention              | Example                           |
| ----------- | ----------------------- | --------------------------------- |
| Services    | `*Service.ts`           | `InternetArchiveService.ts`       |
| Types       | Interface in `types.ts` | `ArchiveResult`                   |
| Preferences | `extensions.momento7.*` | `extensions.momento7.autoArchive` |
| Tags        | `archived`              | Item tag after archiving          |

### Non-Obvious Behaviors

1. **Archive.today uses Cloudflare Worker** - Direct requests blocked by CORS.
2. **Robust Links format** - `<a href="..." data-originalurl="..." data-versionurl="..." data-versiondate="...">`.
3. **Extra field format** - `{serviceId}Archived: {url}` appended to existing content.
4. **Preferences stored** - Via `Zotero.Prefs` with `extensions.momento7.` prefix.
5. **Credentials stored** - Via CredentialManager with encryption.
6. **Rate limiting** - 1 second minimum between requests per service.

### HTTP Request Pattern

Use 2-argument form for `Zotero.HTTP.request`:

```typescript
// Correct
const response = await Zotero.HTTP.request(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
  timeout: 60000,
});

// Incorrect (legacy 3-arg form)
// Zotero.HTTP.request('POST', url, options)
```

### Testing

- Uses Jest with jsdom environment
- Comprehensive Zotero mocks in `tests/setup.ts`
- 644 tests with 88% coverage
- Run with `npm test` or `npm run test:coverage`

## Gotchas

- **Zotero.HTTP.request** uses 2-arg form: `(url, options)` not `(method, url, options)`
- **ProgressWindow** must use `InstanceType<typeof Zotero.ProgressWindow>` as type
- **Notifier callbacks** run for ALL item types - filter by `type === 'item'`
- **Preferences** use `Zotero.Prefs.get/set` with full key path
- **CircuitBreaker** needs volume threshold before opening
- **CredentialManager** is async - credentials use `await`

## Security

- **Credential storage**: Encrypted via CredentialManager
- **Header injection prevention**: Credentials validated before HTTP headers
- **XSS prevention**: HtmlUtils.escape() for all user-provided HTML content
- **Input validation**: URLs validated before archiving
