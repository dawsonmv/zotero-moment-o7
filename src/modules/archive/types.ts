/**
 * Service type definitions
 */

// Configuration for config-driven archive services
export interface ResponseParser {
  type: "json" | "regex";
  path?: string; // JSONPath like "data.url"
  pattern?: string; // Regex pattern
  captureGroup?: number; // For regex patterns
  urlPrefix?: string; // Prepend to extracted URL
}

export interface HttpEndpoint {
  url: string; // Template: "https://api.example.com/save?url={{url}}"
  method: "GET" | "POST";
  headers?: Record<string, string>;
  bodyTemplate?: string; // Template: '{"url":"{{url}}"}'
  timeout?: number;
}

export interface AuthConfig {
  type: "header"; // Future: "query", "body"
  credentialKey: string; // Key in CredentialManager (e.g., "permaCCApiKey")
  headerName: string; // Header name (e.g., "Authorization")
  template: string; // Template: "ApiKey {{credential}}"
}

export interface ServiceRuntime {
  // URL validation (optional)
  urlValidator?: {
    type: "regex";
    pattern: string;
    errorMessage?: string;
  };

  // Archive submission endpoint (required)
  archiveEndpoint: HttpEndpoint;

  // Response parsing (required)
  responseParser: ResponseParser;

  // Check existing archives (optional)
  checkEndpoint?: HttpEndpoint & {
    parser: ResponseParser;
  };

  // Authentication (optional)
  auth?: AuthConfig;
}

export interface ServiceConfig {
  name: string;
  id: string;
  homepage?: string;
  capabilities?: {
    acceptsUrl: boolean;
    returnsUrl: boolean;
    preservesJavaScript: boolean;
    preservesInteractiveElements: boolean;
    requiresAuthentication?: boolean;
    hasQuota?: boolean;
    regionRestricted?: boolean;
  };

  // Configuration for config-driven services (optional)
  runtime?: ServiceRuntime;
}

export interface ArchiveResult {
  item: Zotero.Item;
  success: boolean;
  archivedUrl?: string;
  message?: string;
  error?: string;
  service?: string;
  existingArchive?: any;
}

export interface ArchiveProgress {
  onStatusUpdate: (status: string) => void;
  onError?: (error: string) => void;
}

export interface SingleArchiveResult {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: {
    originalUrl: string;
    archiveDate: string;
    service: string;
    [key: string]: any;
  };
}

export interface ArchiveService {
  readonly name: string;
  readonly id: string;

  isAvailable(): Promise<boolean>;
  archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;

  // Optional methods
  checkValidUrl?(url: string): boolean;
  getBestUrl?(item: Zotero.Item): string;
}

export interface ServiceRegistryEntry {
  id: string;
  service: ArchiveService;
}

// Error types
export enum ArchiveErrorType {
  RateLimit = "RATE_LIMIT",
  AuthRequired = "AUTH_REQUIRED",
  Blocked = "BLOCKED",
  NotFound = "NOT_FOUND",
  ServerError = "SERVER_ERROR",
  Timeout = "TIMEOUT",
  InvalidUrl = "INVALID_URL",
  Unknown = "UNKNOWN",
}

export class ArchiveError extends Error {
  constructor(
    public type: ArchiveErrorType,
    message: string,
    public statusCode?: number,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "ArchiveError";
  }
}

// Preference types
export interface Preferences {
  autoArchive: boolean;
  defaultService: string;
  iaTimeout: number;
  iaMaxRetries: number;
  iaRetryDelay: number;
  iaAccessKey?: string;
  iaSecretKey?: string;
  robustLinkServices: string[];
  fallbackOrder: string[];
  permaccApiKey?: string;
  orcidApiKey?: string;
  // Memento pre-check preferences
  checkBeforeArchive: boolean;
  archiveAgeThresholdHours: number;
  skipExistingMementos: boolean;
}

// Menu item configuration
export interface MenuItemConfig {
  id: string;
  label: string;
  serviceId?: string;
  handler: () => Promise<void>;
}

// Progress window wrapper
export interface ProgressWindow {
  show(title: string, message?: string): void;
  update(message: string): void;
  close(): void;
  error(message: string): void;
  success(message: string): void;
}

// HTTP request options (compatible with Zotero.HTTP.request)
export interface HTTPRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  timeout?: number;
  responseType?: "text" | "json" | "document";
  successCodes?: number[];
  [key: string]: unknown; // Allow additional Zotero-specific options
}
