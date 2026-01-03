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
└── types/                # Type definitions
    ├── augmentations/    # Zotero 7 API augmentations
    │   └── http.d.ts     # HTTP.request 2-arg overload
    ├── build/            # Build tool globals
    │   └── globals.d.ts
    ├── plugin/           # Plugin-specific types
    │   ├── preferences.d.ts  # Plugin preferences augmentation
    │   └── i18n.d.ts     # i18n message IDs
    └── README.md         # Type system documentation

addon/                    # Static addon files
├── bootstrap.js
├── manifest.json
├── prefs.js
├── content/
│   └── preferences.xhtml
└── locale/
    └── en-US/
        └── addon.ftl

tests/                    # Jest unit tests (739 tests, 88% coverage)
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

## Type System Organization

### Type Definition Sources

The project uses three type definition sources:

1. **zotero-types** (node_modules/zotero-types)
   - Official Zotero API type definitions via `zotero-types@4.1.0-beta.4`
   - Extended via tsconfig: `"extends": "zotero-types/entries/sandbox/"`
   - Provides: `Zotero.*`, `_ZoteroTypes.*`, `XUL.*` namespaces
   - Contains all Zotero APIs and plugin base types

2. **Project Augmentations** (src/types/augmentations/)
   - Extensions to zotero-types for Zotero 7 APIs not yet in the package
   - Currently: `http.d.ts` - HTTP.request 2-argument overload
   - Only add when a Zotero 7 API is verified but missing from zotero-types
   - To check if type exists: `grep -r "type-name" node_modules/zotero-types/types/`

3. **Project Types** (src/types/)
   - **build/** - Build tool globals injected during build (ztoolkit, addon, **env**)
   - **plugin/** - Plugin-specific types
     - preferences.d.ts - Zotero preference type augmentation with plugin prefs
     - i18n.d.ts - i18n/Fluent message ID definitions

### Type Usage Guidelines

**DO:**

- Use types from zotero-types directly: `Zotero.Item`, `_ZoteroTypes.ZoteroPane`
- Use zotero-types classes directly as types: `Zotero.ProgressWindow` (not `InstanceType<typeof ...>`)
- Augment \_ZoteroTypes namespace for missing Zotero 7 APIs
- Check zotero-types before adding augmentations

**DON'T:**

- Re-declare types that exist in zotero-types
- Use workaround interfaces when the real type exists
- Mix test types (tests/types/mocks.d.ts) with production types
- Keep one-off types in src/types/ - keep them local to their module

### Common Type Patterns

```typescript
// Items from Zotero API
const item: Zotero.Item = ...;
const items: Zotero.Items = ...;

// ProgressWindow - use class directly as type
const pw: Zotero.ProgressWindow = new Zotero.ProgressWindow();

// ZoteroPane from Zotero.getActiveZoteroPane()
const pane: _ZoteroTypes.ZoteroPane | null = Zotero.getActiveZoteroPane();

// HTTP requests - use 2-arg form (augmented in src/types/augmentations/)
await Zotero.HTTP.request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  timeout: 60000,
});

// Plugin preferences - augmented with plugin-specific prefs
const autoArchive: boolean = Zotero.Prefs.get('extensions.momento7.autoArchive');
```

### Test Types

Test-only type mocks are in `tests/types/mocks.d.ts`:

- Minimal Zotero API mocks for Node.js/jsdom environment
- Intentionally different from production types (test doubles, not real APIs)
- Provided by tests/setup.ts at runtime

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
5. **Credentials stored** - Via Firefox's `nsILoginManager` (OS-native secure storage via Keychain/Credential Manager/Secret Service).
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
- 739 tests with 88% coverage
- Run with `npm test` or `npm run test:coverage`

## Gotchas

- **Zotero.HTTP.request** uses 2-arg form: `(url, options)` not `(method, url, options)`
- **ProgressWindow** must use `InstanceType<typeof Zotero.ProgressWindow>` as type
- **Notifier callbacks** run for ALL item types - filter by `type === 'item'`
- **Preferences** use `Zotero.Prefs.get/set` with full key path
- **CircuitBreaker** needs volume threshold before opening
- **CredentialManager** is async - credentials use `await`

## Security

### Credential Storage (nsILoginManager)

Credentials are stored securely using Firefox's `nsILoginManager` API, which provides OS-native encryption:

- **Storage Backend**:
  - **macOS**: Keychain integration
  - **Windows**: Windows Credential Manager
  - **Linux**: Secret Service API / GNOME Keyring
- **Implementation**: `SecureCredentialStorage` class wraps the `nsILoginManager` API
- **Usage**: `CredentialManager` delegates all credential operations to `SecureCredentialStorage`
- **Encrypted Fields**: Origin (`chrome://zotero`), Realm (`Momento7 Credentials`), credentials stored as username/password pairs
- **Migration**: Automatic migration from legacy storage on first use
  - **Plaintext** credentials (legacy) → nsILoginManager
  - **Base64 obfuscated** credentials (previous fallback) → nsILoginManager
  - **Web Crypto AES-GCM encrypted** credentials → Decryption attempted using profile-based key derivation; if successful, migrated to nsILoginManager

**Credential Keys Stored**:

- `iaAccessKey` - Internet Archive S3 Access Key
- `iaSecretKey` - Internet Archive S3 Secret Key
- `permaCCApiKey` - Perma.cc API Key
- `orcidApiKey` - ORCID API Key (future use)

**API Usage**:

```typescript
// Store credential
const credManager = CredentialManager.getInstance();
await credManager.set("iaAccessKey", "my-access-key");

// Retrieve credential
const key = await credManager.get("iaAccessKey");

// Check if credential exists
const exists = await credManager.exists("iaAccessKey");

// Delete credential
await credManager.delete("iaAccessKey");

// Migrate legacy credentials (automatic on first use)
await credManager.migrateIfNeeded();
```

### Additional Security Measures

- **Header injection prevention**: Credentials validated before HTTP headers
- **XSS prevention**: HtmlUtils.escape() for all user-provided HTML content
- **Input validation**: URLs validated before archiving
