/**
 * Preferences management for Zotero Moment-o7
 */

import { Preferences } from '../services/types';

export class PreferencesManager {
	private static instance: PreferencesManager;

	// Default preferences
	private readonly defaults: Preferences = {
		autoArchive: true,
		defaultService: 'internetarchive',
		iaTimeout: 120000, // 2 minutes
		iaMaxRetries: 3,
		iaRetryDelay: 5000, // 5 seconds
		robustLinkServices: ['internetarchive', 'archivetoday'],
		fallbackOrder: ['internetarchive', 'archivetoday', 'arquivopt', 'permacc', 'ukwebarchive'],
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
	init(): void {
		// Set defaults for any missing preferences
		for (const [key, value] of Object.entries(this.defaults)) {
			const prefKey = `extensions.momento7.${key}`;
			if (Zotero.Prefs.get(prefKey) === undefined) {
				this.setPref(key as keyof Preferences, value);
			}
		}
	}

	/**
	 * Get all preferences
	 */
	getAll(): Preferences {
		return {
			autoArchive: this.getPref('autoArchive'),
			defaultService: this.getPref('defaultService'),
			iaTimeout: this.getPref('iaTimeout'),
			iaMaxRetries: this.getPref('iaMaxRetries'),
			iaRetryDelay: this.getPref('iaRetryDelay'),
			iaAccessKey: this.getStringPref('iaAccessKey'),
			iaSecretKey: this.getStringPref('iaSecretKey'),
			robustLinkServices: this.getPref('robustLinkServices'),
			fallbackOrder: this.getPref('fallbackOrder'),
			permaccApiKey: this.getStringPref('permaccApiKey'),
			orcidApiKey: this.getStringPref('orcidApiKey'),
		};
	}

	/**
	 * Get a single preference
	 */
	getPref<K extends keyof Preferences>(key: K): Preferences[K] {
		const prefKey = `extensions.momento7.${key}`;
		const defaultValue = this.defaults[key];

		if (Array.isArray(defaultValue)) {
			const value = Zotero.Prefs.get(prefKey, defaultValue.join(','));
			return value.split(',').filter((s: string) => s.trim()) as Preferences[K];
		}

		if (defaultValue !== undefined) {
			if (typeof defaultValue === 'string') {
				return Zotero.Prefs.get(prefKey, defaultValue) as Preferences[K];
			} else if (typeof defaultValue === 'number') {
				return Zotero.Prefs.get(prefKey, defaultValue) as Preferences[K];
			} else if (typeof defaultValue === 'boolean') {
				return Zotero.Prefs.get(prefKey, defaultValue) as Preferences[K];
			}
		}
		return Zotero.Prefs.get(prefKey) as Preferences[K];
	}

	/**
	 * Get string preference (may be undefined)
	 */
	private getStringPref(key: string): string | undefined {
		const value = Zotero.Prefs.get(`extensions.momento7.${key}`);
		return value || undefined;
	}

	/**
	 * Set a preference
	 */
	setPref<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
		const prefKey = `extensions.momento7.${key}`;

		if (Array.isArray(value)) {
			Zotero.Prefs.set(prefKey, value.join(','));
		} else {
			Zotero.Prefs.set(prefKey, value);
		}
	}

	/**
	 * Clear a preference
	 */
	clearPref(key: keyof Preferences): void {
		Zotero.Prefs.clear(`extensions.momento7.${key}`);
	}

	/**
	 * Reset all preferences to defaults (except API keys)
	 */
	resetToDefaults(): void {
		for (const key of Object.keys(this.defaults) as Array<keyof Preferences>) {
			if (!key.includes('ApiKey')) {
				this.clearPref(key);
			}
		}
		this.init();
	}

	/**
	 * Open preferences dialog
	 */
	openDialog(): void {
		const params = this.getAll();

		window.openDialog(
			'data:application/xhtml+xml,' + encodeURIComponent(this.getPreferencesXML()),
			'momento7-preferences',
			'chrome,dialog,centerscreen,modal,resizable=yes,width=600,height=700',
			params
		);

		// Save if OK was clicked
		if ((params as any).save) {
			this.saveFromDialog(params);
		}
	}

	/**
	 * Save preferences from dialog
	 */
	private saveFromDialog(params: Preferences & { save?: boolean }): void {
		this.setPref('autoArchive', params.autoArchive);
		this.setPref('defaultService', params.defaultService);
		this.setPref('iaTimeout', params.iaTimeout);
		this.setPref('iaMaxRetries', params.iaMaxRetries);
		this.setPref('iaRetryDelay', params.iaRetryDelay);
		this.setPref('robustLinkServices', params.robustLinkServices);
		this.setPref('fallbackOrder', params.fallbackOrder);

		if (params.iaAccessKey) {
			this.setPref('iaAccessKey' as any, params.iaAccessKey);
		}
		if (params.iaSecretKey) {
			this.setPref('iaSecretKey' as any, params.iaSecretKey);
		}
		if (params.permaccApiKey) {
			this.setPref('permaccApiKey' as any, params.permaccApiKey);
		}
		if (params.orcidApiKey) {
			this.setPref('orcidApiKey' as any, params.orcidApiKey);
		}
	}

	/**
	 * Static convenience methods
	 */
	static getTimeout(service: string): number {
		const instance = PreferencesManager.getInstance();
		if (service === 'internetarchive') {
			return instance.getPref('iaTimeout');
		}
		// Default timeout for other services
		return 60000;
	}

	static getEnabledServices(): string[] {
		return PreferencesManager.getInstance().getPref('robustLinkServices');
	}

	static getFallbackOrder(): string[] {
		return PreferencesManager.getInstance().getPref('fallbackOrder');
	}

	static getIACredentials(): { accessKey?: string; secretKey?: string } {
		const instance = PreferencesManager.getInstance();
		return {
			accessKey: instance.getAll().iaAccessKey,
			secretKey: instance.getAll().iaSecretKey,
		};
	}

	static hasIACredentials(): boolean {
		const creds = PreferencesManager.getIACredentials();
		return !!(creds.accessKey && creds.secretKey);
	}

	/**
	 * Get preferences dialog XML
	 */
	private getPreferencesXML(): string {
		// Simplified version - in production this would be in a separate file
		return `<?xml version="1.0"?>
<?xml-stylesheet href="chrome://global/skin/" type="text/css"?>
<dialog xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
  title="Moment-o7 Preferences"
  buttons="accept,cancel"
  onaccept="return savePreferences();"
  style="padding: 0;">
  
  <script><![CDATA[
    function savePreferences() {
      // Save logic here
      window.arguments[0].save = true;
      return true;
    }
    
    function loadPreferences() {
      // Load logic here
    }
  ]]></script>
  
  <vbox style="padding: 10px; width: 550px;">
    <!-- Preferences UI here -->
  </vbox>
  
  <script>loadPreferences();</script>
</dialog>`;
	}
}
