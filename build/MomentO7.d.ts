/**
 * Main Zotero Moment-o7 plugin class
 */
export declare class MomentO7 {
    id: string | null;
    version: string | null;
    rootURI: string | null;
    initialized: boolean;
    private windows;
    private notifierID;
    /**
     * Initialize the plugin
     */
    init({ id, version, rootURI }: {
        id: string;
        version: string;
        rootURI: string;
    }): void;
    /**
     * Initialize services
     */
    private initializeServices;
    /**
     * Register notifier for auto-archiving
     */
    private registerNotifier;
    /**
     * Add UI elements to a window
     */
    addToWindow(window: Window): void;
    /**
     * Add menu items to the window
     */
    private addMenuItems;
    /**
     * Create a menu item
     */
    private createMenuItem;
    /**
     * Archive selected items
     */
    private archiveSelected;
    /**
     * Create robust links for selected items
     */
    private createRobustLinks;
    /**
     * Open preferences dialog
     */
    private openPreferences;
    /**
     * Show success message
     */
    private showSuccess;
    /**
     * Show error message
     */
    private showError;
    /**
     * Show general message
     */
    private showMessage;
    /**
     * Remove from window
     */
    removeFromWindow(window: Window): void;
    /**
     * Add to all windows
     */
    addToAllWindows(): void;
    /**
     * Remove from all windows
     */
    removeFromAllWindows(): void;
    /**
     * Main entry point
     */
    main(): Promise<void>;
    /**
     * Shutdown
     */
    shutdown(): void;
    /**
     * Log message
     */
    private log;
}
export declare const ZoteroMomentO7: MomentO7;
//# sourceMappingURL=MomentO7.d.ts.map