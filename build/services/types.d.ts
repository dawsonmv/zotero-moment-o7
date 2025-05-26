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
    checkValidUrl?(url: string): boolean;
    getBestUrl?(item: Zotero.Item): string;
}
export interface ServiceRegistryEntry {
    id: string;
    service: ArchiveService;
}
export declare enum ArchiveErrorType {
    RateLimit = "RATE_LIMIT",
    AuthRequired = "AUTH_REQUIRED",
    Blocked = "BLOCKED",
    NotFound = "NOT_FOUND",
    ServerError = "SERVER_ERROR",
    Timeout = "TIMEOUT",
    InvalidUrl = "INVALID_URL",
    Unknown = "UNKNOWN"
}
export declare class ArchiveError extends Error {
    type: ArchiveErrorType;
    statusCode?: number | undefined;
    retryAfter?: number | undefined;
    constructor(type: ArchiveErrorType, message: string, statusCode?: number | undefined, retryAfter?: number | undefined);
}
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
export interface MenuItemConfig {
    id: string;
    label: string;
    serviceId?: string;
    handler: () => Promise<void>;
}
export interface ProgressWindow {
    show(title: string, message?: string): void;
    update(message: string): void;
    close(): void;
    error(message: string): void;
    success(message: string): void;
}
//# sourceMappingURL=types.d.ts.map