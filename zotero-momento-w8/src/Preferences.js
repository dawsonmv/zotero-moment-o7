// Preference helpers for Zotero Momento-W8
// Defaults are registered by Zotero from prefs.js at the plugin root;
// init() re-applies them defensively in case that file was not processed.

Zotero.MomentoW8.Preferences = {
	// Canonical defaults (must stay in sync with /prefs.js)
	defaults: {
		"extensions.zotero.momentow8.autoArchive": true,
		"extensions.zotero.momentow8.autoArchiveDelay": 3000,
		"extensions.zotero.momentow8.enabledServices": "internetarchive,archivetoday",
		"extensions.zotero.momentow8.archiveTimeout": 30000,
		"extensions.zotero.momentow8.robustLinkServices": "internetarchive,archivetoday",
		"extensions.zotero.momentow8.fallbackOrder": "internetarchive,archivetoday,arquivopt,permacc,ukwebarchive",
		"extensions.zotero.momentow8.defaultService": "internetarchive",
		"extensions.zotero.momentow8.enableMemento": true,
		"extensions.zotero.momentow8.createArchiveNote": true,
		"extensions.zotero.momentow8.iaTimeout": 120000,
		"extensions.zotero.momentow8.iaMaxRetries": 3,
		"extensions.zotero.momentow8.iaRetryDelay": 5000
	},

	init() {
		for (const [key, value] of Object.entries(this.defaults)) {
			const currentValue = Zotero.Prefs.get(key, true);
			if (currentValue === undefined || currentValue === null) {
				Zotero.Prefs.set(key, value, true);
			}
		}
		this._initialized = true;
	},

	/**
	 * Get a preference with a fallback default.
	 * @param {string} key - Fully qualified pref key (extensions.zotero.momentow8.*)
	 * @param {*} defaultValue - Returned when the pref is unset
	 */
	getSafePref(key, defaultValue) {
		if (!this._initialized) {
			this.init();
		}
		const value = Zotero.Prefs.get(key, true);
		return value !== undefined && value !== null ? value : defaultValue;
	}
};
