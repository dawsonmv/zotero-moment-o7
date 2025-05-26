/**
 * Preferences management for Zotero Moment-o7
 */
import { Preferences } from '../services/types';
export declare class PreferencesManager {
    private static instance;
    private readonly defaults;
    private constructor();
    static getInstance(): PreferencesManager;
    /**
     * Initialize preferences with defaults
     */
    init(): void;
    /**
     * Get all preferences
     */
    getAll(): Preferences;
    /**
     * Get a single preference
     */
    getPref<K extends keyof Preferences>(key: K): Preferences[K];
    /**
     * Get string preference (may be undefined)
     */
    private getStringPref;
    /**
     * Set a preference
     */
    setPref<K extends keyof Preferences>(key: K, value: Preferences[K]): void;
    /**
     * Clear a preference
     */
    clearPref(key: keyof Preferences): void;
    /**
     * Reset all preferences to defaults (except API keys)
     */
    resetToDefaults(): void;
    /**
     * Open preferences dialog
     */
    openDialog(): void;
    /**
     * Save preferences from dialog
     */
    private saveFromDialog;
    /**
     * Static convenience methods
     */
    static getTimeout(service: string): number;
    static getEnabledServices(): string[];
    static getFallbackOrder(): string[];
    /**
     * Get preferences dialog XML
     */
    private getPreferencesXML;
}
//# sourceMappingURL=PreferencesManager.d.ts.map