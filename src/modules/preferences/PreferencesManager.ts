/**
 * Preferences management for Zotero Moment-o7
 * Wrapper around Zotero.Prefs for typed access to plugin preferences
 */

import { config } from "../../../package.json";
import { CredentialManager } from "../../utils/CredentialManager";

export interface Preferences {
  autoArchive: boolean;
  defaultService: string;
  iaTimeout: number;
  iaMaxRetries: number;
  iaRetryDelay: number;
  robustLinkServices: string[];
  fallbackOrder: string[];
  checkBeforeArchive: boolean;
  archiveAgeThresholdHours: number;
  skipExistingMementos: boolean;
}

export class PreferencesManager {
  private static instance: PreferencesManager;
  private readonly prefix = config.prefsPrefix;

  // Default preferences
  private readonly defaults: Preferences = {
    autoArchive: true,
    defaultService: "internetarchive",
    iaTimeout: 120000,
    iaMaxRetries: 3,
    iaRetryDelay: 5000,
    robustLinkServices: ["internetarchive", "archivetoday"],
    fallbackOrder: [
      "internetarchive",
      "archivetoday",
      "arquivopt",
      "permacc",
      "ukwebarchive",
    ],
    checkBeforeArchive: true,
    archiveAgeThresholdHours: 24,
    skipExistingMementos: false,
  };

  private constructor() {}

  static getInstance(): PreferencesManager {
    if (!PreferencesManager.instance) {
      PreferencesManager.instance = new PreferencesManager();
    }
    return PreferencesManager.instance;
  }

  /**
   * Initialize preferences with defaults
   */
  async init(): Promise<void> {
    // Set defaults for any missing preferences
    for (const [key, value] of Object.entries(this.defaults)) {
      const prefKey = `${this.prefix}.${key}`;
      if (Zotero.Prefs.get(prefKey) === undefined) {
        this.setPref(key as keyof Preferences, value);
      }
    }

    // Initialize credential manager
    const credManager = CredentialManager.getInstance();
    await credManager.init();
    await credManager.migrateIfNeeded();
  }

  /**
   * Get all preferences
   */
  getAll(): Preferences {
    return {
      autoArchive: this.getPref("autoArchive"),
      defaultService: this.getPref("defaultService"),
      iaTimeout: this.getPref("iaTimeout"),
      iaMaxRetries: this.getPref("iaMaxRetries"),
      iaRetryDelay: this.getPref("iaRetryDelay"),
      robustLinkServices: this.getPref("robustLinkServices"),
      fallbackOrder: this.getPref("fallbackOrder"),
      checkBeforeArchive: this.getPref("checkBeforeArchive"),
      archiveAgeThresholdHours: this.getPref("archiveAgeThresholdHours"),
      skipExistingMementos: this.getPref("skipExistingMementos"),
    };
  }

  /**
   * Get a single preference
   */
  getPref<K extends keyof Preferences>(key: K): Preferences[K] {
    const prefKey = `${this.prefix}.${key}`;
    const defaultValue = this.defaults[key];

    const value = Zotero.Prefs.get(prefKey);

    if (value === undefined) {
      return defaultValue;
    }

    // Handle array preferences stored as comma-separated strings
    if (Array.isArray(defaultValue) && typeof value === "string") {
      return value.split(",").map((s) => s.trim()) as Preferences[K];
    }

    return value as Preferences[K];
  }

  /**
   * Set a preference
   */
  setPref<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    const prefKey = `${this.prefix}.${key}`;

    // Convert arrays to comma-separated strings
    if (Array.isArray(value)) {
      Zotero.Prefs.set(prefKey, value.join(","));
    } else {
      Zotero.Prefs.set(prefKey, value);
    }
  }

  /**
   * Reset all preferences to defaults
   */
  resetToDefaults(): void {
    for (const key of Object.keys(this.defaults) as Array<keyof Preferences>) {
      this.setPref(key, this.defaults[key]);
    }
  }

  // Static convenience methods

  static getTimeout(): number {
    return PreferencesManager.getInstance().getPref("iaTimeout");
  }

  static getRobustLinkServices(): string[] {
    return PreferencesManager.getInstance().getPref("robustLinkServices");
  }

  static getFallbackOrder(): string[] {
    return PreferencesManager.getInstance().getPref("fallbackOrder");
  }

  static async hasIACredentials(): Promise<boolean> {
    const credManager = CredentialManager.getInstance();
    const accessKey = await credManager.getCredential("iaAccessKey");
    const secretKey = await credManager.getCredential("iaSecretKey");
    return !!(accessKey && secretKey);
  }

  static async getIACredentials(): Promise<{
    accessKey: string | undefined;
    secretKey: string | undefined;
  }> {
    const credManager = CredentialManager.getInstance();
    return {
      accessKey: await credManager.getCredential("iaAccessKey"),
      secretKey: await credManager.getCredential("iaSecretKey"),
    };
  }

  static getCheckBeforeArchive(): boolean {
    return PreferencesManager.getInstance().getPref("checkBeforeArchive");
  }

  static getArchiveAgeThreshold(): number {
    const hours = PreferencesManager.getInstance().getPref(
      "archiveAgeThresholdHours",
    );
    return hours * 60 * 60 * 1000; // Convert to milliseconds
  }

  static getSkipExistingMementos(): boolean {
    return PreferencesManager.getInstance().getPref("skipExistingMementos");
  }

  // Alias methods for backward compatibility
  static shouldCheckBeforeArchive(): boolean {
    return PreferencesManager.getCheckBeforeArchive();
  }

  static shouldSkipExistingMementos(): boolean {
    return PreferencesManager.getSkipExistingMementos();
  }

  static getArchiveAgeThresholdMs(): number {
    return PreferencesManager.getArchiveAgeThreshold();
  }

  static async getPermaCCApiKey(): Promise<string | undefined> {
    const credManager = CredentialManager.getInstance();
    return credManager.getCredential("permaCCApiKey");
  }

  static getEnabledServices(): string[] {
    return PreferencesManager.getInstance().getPref("fallbackOrder");
  }

  static getDefaultService(): string {
    return PreferencesManager.getInstance().getPref("defaultService");
  }

  static isAutoArchiveEnabled(): boolean {
    return PreferencesManager.getInstance().getPref("autoArchive");
  }
}
