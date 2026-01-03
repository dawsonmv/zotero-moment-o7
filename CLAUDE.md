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
├── config/               # Service configurations (declarative)
│   ├── index.ts          # Export all configs
│   └── services/
│       ├── permacc.config.ts
│       ├── arquivopt.config.ts
│       └── ukwebarchive.config.ts
├── modules/
│   ├── archive/          # Archive service implementations
│   │   ├── types.ts      # Shared interfaces (including ServiceConfig)
│   │   ├── BaseArchiveService.ts
│   │   ├── ConfigurableArchiveService.ts  # Generic config-driven service
│   │   ├── ServiceConfigLoader.ts  # Loads and registers all services
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

There are two approaches to adding archive services:

#### Option 1: Configuration-Driven Service (Recommended for Simple Services)

Use this approach for services with straightforward request/response patterns:

1. Create a configuration file `src/config/services/yourservice.config.ts`:

```typescript
import { ServiceConfig } from "../../modules/archive/types";

export const yourServiceConfig: ServiceConfig = {
  id: "yourservice",
  name: "Your Service",
  homepage: "https://your-service.com",

  capabilities: {
    acceptsUrl: true,
    returnsUrl: true,
    preservesJavaScript: true,
    preservesInteractiveElements: false,
    requiresAuthentication: false,
    hasQuota: false,
    regionRestricted: false,
  },

  runtime: {
    // Optional: Validate URLs before submission
    urlValidator: {
      type: "regex",
      pattern: "^https?://.*",
      errorMessage: "Must be a valid HTTP URL",
    },

    // Required: Archive submission endpoint
    archiveEndpoint: {
      url: "https://api.your-service.com/archive?url={{url}}",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      bodyTemplate: '{"url":"{{url}}"}', // {{url}} interpolated with URL encoding
      timeout: 120000,
    },

    // Required: Parse the response to extract archive URL
    responseParser: {
      type: "json", // "json" uses JSONPath, "regex" uses regex patterns
      path: "archiveUrl", // JSONPath like "data.urls[0]"
      urlPrefix: "https://archive.your-service.com/", // Optional: prepend to result
    },

    // Optional: Authentication with credentials
    auth: {
      type: "header",
      credentialKey: "yourServiceApiKey", // Key in CredentialManager
      headerName: "Authorization",
      template: "Bearer {{credential}}", // {{credential}} replaced with stored value
    },

    // Optional: Check for existing archives before submission
    checkEndpoint: {
      url: "https://api.your-service.com/search?url={{url}}",
      method: "GET",
      parser: {
        type: "regex",
        pattern: "https://archive\\.your-service\\.com/\\d+/.*",
      },
    },
  },
};
```

2. Export from `src/config/index.ts`:

```typescript
export { yourServiceConfig } from "./services/yourservice.config";
```

3. The `ServiceConfigLoader` automatically loads and registers the service.

**When to use configuration-driven services:**

- Simple HTTP request/response patterns
- Response extraction via JSON or regex
- No complex state management or polling
- Examples: Perma.cc, Arquivo.pt, UK Web Archive

#### Option 2: TypeScript Service (For Complex Logic)

Use this approach for services with complex behavior:

1. Create `src/modules/archive/YourService.ts` extending `BaseArchiveService`
2. Implement `isAvailable()` and `archiveUrl()` methods
3. Register in `ServiceRegistry` initialization
4. Add to fallback order in `PreferencesManager.defaults`

**When to use TypeScript services:**

- Async polling or job tracking
- Complex HTML/response parsing
- Authentication with multiple steps
- Conditional logic based on response state
- Examples: Internet Archive (SPN2 API, polling), Archive.Today (Cloudflare proxy)

### Key Abstractions

- **BaseArchiveService**: Handles progress windows, URL validation, metadata saving, error mapping. Subclasses only implement `archiveUrl()`.
- **ConfigurableArchiveService**: Generic implementation driven by configuration files. Handles templating, response parsing, and HTTP interactions without custom code.
- **MementoProtocol**: Stateless utility for RFC 7089 Link header parsing. Use `parseLinkHeader()`, `parseTimeMap()`, `findBestMemento()`.
- **Cache<T>**: Generic LRU cache with TTL.
- **CircuitBreaker**: Wrap external calls with `execute(operation, fallback)`.

### Configuration-Driven Archive Services

The system supports defining archive services through TypeScript configuration files, eliminating the need for custom service classes for simple services.

#### How ConfigurableArchiveService Works

1. **Configuration Loading**: `ServiceConfigLoader.loadAllServices()` is called during initialization
   - Instantiates hardcoded services (Internet Archive, Archive.Today)
   - Loads config files from `src/config/services/*.config.ts`
   - Registers all services with `ServiceRegistry`

2. **Service Lifecycle**:
   - Configuration passed to `ConfigurableArchiveService` constructor
   - `isAvailable()` checks if service is configured and credentials exist
   - `archive(items)` delegates to `archiveUrl(url)` for each URL
   - `archiveUrl(url)` orchestrates: validation → check existing → submit → parse response

3. **URL Validation** (`urlValidator`):
   - Optional regex-based pre-submission validation
   - Throws `ArchiveErrorType.InvalidUrl` if pattern doesn't match
   - Enables early rejection of incompatible URLs

4. **Checking Existing Archives** (`checkEndpoint`):
   - Optional endpoint to query for previously archived versions
   - Used to avoid duplicate submissions and find existing URLs
   - If successful, returns archive URL directly without submission
   - Failure to check doesn't block subsequent submission attempt

5. **Archive Submission** (`archiveEndpoint`):
   - Sends HTTP request to archiving service
   - URL interpolation: `{{url}}` replaced with URL-encoded user URL
   - Body template: JSON/form data with interpolated values
   - Headers: Static headers + optional auth headers

6. **Authentication** (`auth`):
   - Header-based authentication (currently only type supported)
   - Credential retrieved from `CredentialManager` using `credentialKey`
   - Template string: `{{credential}}` replaced with stored credential
   - Example: `"Bearer {{credential}}"` becomes `"Bearer secret-token-xyz"`

7. **Response Parsing** (`responseParser`):
   - **JSON Parser**: Uses JSONPath to extract value from JSON response
     - `path: "data.archiveUrl"` → Extract `response.data.archiveUrl`
     - Useful for JSON APIs that return archive URL directly
   - **Regex Parser**: Uses regex patterns to extract URL from text/HTML response
     - `pattern: "https://archive\\.example\\.com/\\d+/.*"` → Extract matching URL
     - `captureGroup: 1` → Use capture group instead of full match (optional)
     - Useful for HTML responses with archive links embedded
   - `urlPrefix`: Optionally prepend string to result (e.g., base URL for relative paths)

8. **Template Interpolation**:
   - Supports `{{url}}` placeholders in:
     - `archiveEndpoint.url` (for query parameters)
     - `archiveEndpoint.bodyTemplate` (for request body)
     - `checkEndpoint.url` (for search queries)
   - Values are automatically URL-encoded to prevent injection
   - Example: `"https://example.com?search={{url}}"` with URL `"https://test.com/page?id=1"` becomes `"https://example.com?search=https%3A%2F%2Ftest.com%2Fpage%3Fid%3D1"`

#### Example: Arquivo.pt Configuration

```typescript
export const arquivoPtConfig: ServiceConfig = {
  id: "arquivopt",
  name: "Arquivo.pt",
  runtime: {
    // Check endpoint - search for existing archives
    checkEndpoint: {
      url: "https://arquivo.pt/wayback/*/{{url}}",
      method: "GET",
      parser: {
        type: "regex",
        pattern: "/wayback/(\\d{14})/",
        captureGroup: 1,
        urlPrefix: "https://arquivo.pt/wayback/",
      },
    },

    // Submit URL for archiving
    archiveEndpoint: {
      url: "https://arquivo.pt/save",
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      bodyTemplate: "url={{url}}",
      timeout: 120000,
    },

    // Extract archive URL from HTML response
    responseParser: {
      type: "regex",
      pattern: "https?://arquivo\\.pt/wayback/\\d{14}/[^\\s\"'<>]+",
      captureGroup: 0,
    },
  },
};
```

#### Testing Configuration-Driven Services

Test files should verify:

- Configuration creates valid service instance
- URL validation works as expected
- Response parsing extracts correct values
- Authentication headers are properly formatted
- Template interpolation handles URL encoding correctly

Example test pattern:

```typescript
it("should parse JSON response with JSONPath", () => {
  const response = JSON.stringify({ data: { url: "archive123" } });
  const parser: ResponseParser = { type: "json", path: "data.url" };
  // Verify parsing logic extracts "archive123"
});

it("should extract URL from regex pattern", () => {
  const response =
    '<a href="https://archive.example.com/20231201/page">Link</a>';
  const parser: ResponseParser = {
    type: "regex",
    pattern: 'https://archive\\.example\\.com/\\d+/[^"]+',
  };
  // Verify regex extracts "https://archive.example.com/20231201/page"
});
```

#### ServiceConfig Interface

The `ServiceConfig` interface extends the core service metadata with optional runtime configuration:

```typescript
interface ServiceConfig {
  // Core metadata
  id: string; // Unique identifier (used in preferences, registry)
  name: string; // Display name
  homepage?: string; // Service website

  capabilities: {
    acceptsUrl: boolean; // Service can submit URLs for archiving
    returnsUrl: boolean; // Service returns archive URL immediately
    preservesJavaScript: boolean; // Archive executes JavaScript
    preservesInteractiveElements: boolean; // Archive preserves interactive elements
    requiresAuthentication: boolean; // Requires API credentials
    hasQuota: boolean; // Service has rate limits or usage quotas
    regionRestricted: boolean; // Only works for certain regions/domains
  };

  // Optional: Configuration-driven service (replaces custom TypeScript class)
  runtime?: ServiceRuntime;
}

interface ServiceRuntime {
  // Optional: URL validation before submission
  urlValidator?: {
    type: "regex";
    pattern: string; // Regex pattern URLs must match
    errorMessage?: string; // Custom error message
  };

  // Required: Where to submit URLs for archiving
  archiveEndpoint: HttpEndpoint;

  // Required: How to parse the archive response
  responseParser: ResponseParser;

  // Optional: Check for existing archives before submitting
  checkEndpoint?: HttpEndpoint & {
    parser: ResponseParser;
  };

  // Optional: Authentication configuration
  auth?: AuthConfig;
}

interface HttpEndpoint {
  url: string; // Supports {{url}} template interpolation
  method: "GET" | "POST";
  headers?: Record<string, string>;
  bodyTemplate?: string; // For POST requests, supports {{url}}
  timeout?: number; // Request timeout in milliseconds
}

interface ResponseParser {
  type: "json" | "regex";
  path?: string; // For JSON: JSONPath like "data.urls[0]"
  pattern?: string; // For regex: regex pattern to match
  captureGroup?: number; // For regex: capture group index (default: 0)
  urlPrefix?: string; // Optional: prepend to extracted value
}

interface AuthConfig {
  type: "header"; // Only header auth currently supported
  credentialKey: string; // Key in CredentialManager to retrieve
  headerName: string; // HTTP header name (e.g., "Authorization")
  template: string; // Template with {{credential}} placeholder
}
```

**Important Notes:**

- `runtime` field is **optional** - allows gradual migration from TypeScript services to configs
- `archiveEndpoint` and `responseParser` are **required** in `runtime`
- All other `runtime` fields are **optional**
- Configuration files are TypeScript modules (not JSON) for type safety and flexibility

### Naming Conventions

| Type                   | Convention                              | Example                           |
| ---------------------- | --------------------------------------- | --------------------------------- |
| TypeScript Services    | `*Service.ts`                           | `InternetArchiveService.ts`       |
| Config-driven Services | `*.config.ts` in `src/config/services/` | `permacc.config.ts`               |
| Service Config Export  | `*Config` variable                      | `permaCCConfig`                   |
| Types                  | Interface in `types.ts`                 | `ArchiveResult`                   |
| Preferences            | `extensions.momento7.*`                 | `extensions.momento7.autoArchive` |
| Credential Keys        | Descriptive, service-specific           | `permaCCApiKey`, `iaAccessKey`    |
| Tags                   | `archived`                              | Item tag after archiving          |

### Non-Obvious Behaviors

1. **Archive.today uses Cloudflare Worker** - Direct requests blocked by CORS.
2. **Robust Links format** - `<a href="..." data-originalurl="..." data-versionurl="..." data-versiondate="...">`.
3. **Extra field format** - `{serviceId}Archived: {url}` appended to existing content.
4. **Preferences stored** - Via `Zotero.Prefs` with `extensions.momento7.` prefix.
5. **Credentials stored** - Via Firefox's `nsILoginManager` (OS-native secure storage via Keychain/Credential Manager/Secret Service).
6. **Rate limiting** - 1 second minimum between requests per service.
7. **Config-driven services require `runtime` field** - Without it, `ConfigurableArchiveService` throws an error. TypeScript services don't need `runtime`.
8. **Template interpolation is automatic** - All `{{url}}` placeholders are URL-encoded automatically. Don't manually encode URLs in config templates.
9. **Response parsing is service-specific** - Some services return JSON, others return HTML. Use appropriate `responseParser` type (json vs regex).
10. **Check endpoint is optional but recommended** - Including a `checkEndpoint` avoids duplicate submissions and can provide immediate results.

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
