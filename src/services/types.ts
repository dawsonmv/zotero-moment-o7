/**
 * Service type definitions
 */

export interface ServiceConfig {
  name: string;
  id: string;
  requiresAuth: boolean;
  supportsMemento: boolean;
  rateLimit: number | null;
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
  RateLimit = 'RATE_LIMIT',
  AuthRequired = 'AUTH_REQUIRED',
  Blocked = 'BLOCKED',
  NotFound = 'NOT_FOUND',
  ServerError = 'SERVER_ERROR',
  Timeout = 'TIMEOUT',
  InvalidUrl = 'INVALID_URL',
  Unknown = 'UNKNOWN'
}

export class ArchiveError extends Error {
  constructor(
    public type: ArchiveErrorType,
    message: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ArchiveError';
  }
}

// Preference types
export interface Preferences {
  autoArchive: boolean;
  defaultService: string;
  iaTimeout: number;
  iaMaxRetries: number;
  iaRetryDelay: number;
  robustLinkServices: string[];
  fallbackOrder: string[];
  permaccApiKey?: string;
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