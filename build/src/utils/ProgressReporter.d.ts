/**
 * Progress reporting system using Observer pattern
 * Decouples progress UI from business logic
 */
export type ProgressEventType = 'start' | 'update' | 'success' | 'error' | 'complete';
export interface ProgressEvent {
    type: ProgressEventType;
    message: string;
    progress?: number;
    details?: any;
    timestamp: Date;
}
export interface ProgressListener {
    onProgress(event: ProgressEvent): void;
}
/**
 * Observable progress reporter
 * Implements the Observer pattern for progress updates
 */
export declare class ProgressReporter {
    private listeners;
    private events;
    private isActive;
    /**
     * Subscribe to progress events
     */
    subscribe(listener: ProgressListener): () => void;
    /**
     * Start a new progress session
     */
    start(message: string): void;
    /**
     * Update progress
     */
    update(message: string, progress?: number): void;
    /**
     * Report success
     */
    success(message: string, details?: any): void;
    /**
     * Report error
     */
    error(message: string, error?: Error): void;
    /**
     * Complete the progress session
     */
    complete(message?: string): void;
    /**
     * Get all events from current session
     */
    getEvents(): ReadonlyArray<ProgressEvent>;
    /**
     * Check if reporter is active
     */
    isReporting(): boolean;
    /**
     * Notify all listeners
     */
    private notify;
}
/**
 * Zotero-specific progress window adapter
 * Implements ProgressListener to show Zotero progress windows
 */
export declare class ZoteroProgressWindowAdapter implements ProgressListener {
    private progressWindow;
    private closeOnComplete;
    private autoCloseDelay;
    constructor(options?: {
        closeOnComplete?: boolean;
        autoCloseDelay?: number;
        closeOnClick?: boolean;
    });
    onProgress(event: ProgressEvent): void;
    private showWindow;
    private updateWindow;
    private showSuccess;
    private showError;
    private closeWindow;
}
//# sourceMappingURL=ProgressReporter.d.ts.map