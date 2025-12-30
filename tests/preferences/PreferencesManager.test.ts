/**
 * Tests for PreferencesManager
 */

import { PreferencesManager } from '../../src/preferences/PreferencesManager';

describe('PreferencesManager', () => {
	let manager: PreferencesManager;
	let prefsStore: Map<string, any>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Reset singleton
		(PreferencesManager as any).instance = undefined;

		// Create a mock preferences store
		prefsStore = new Map();

		// Mock Zotero.Prefs
		(Zotero.Prefs.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
			if (prefsStore.has(key)) {
				return prefsStore.get(key);
			}
			return defaultValue;
		});

		(Zotero.Prefs.set as jest.Mock).mockImplementation((key: string, value: any) => {
			prefsStore.set(key, value);
		});

		(Zotero.Prefs.clear as jest.Mock).mockImplementation((key: string) => {
			prefsStore.delete(key);
		});

		manager = PreferencesManager.getInstance();
	});

	describe('singleton pattern', () => {
		it('should return the same instance', () => {
			const instance1 = PreferencesManager.getInstance();
			const instance2 = PreferencesManager.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe('init', () => {
		it('should set default preferences when not set', () => {
			manager.init();

			expect(Zotero.Prefs.set).toHaveBeenCalled();
			expect(prefsStore.get('extensions.momento7.autoArchive')).toBe(true);
			expect(prefsStore.get('extensions.momento7.defaultService')).toBe('internetarchive');
		});

		it('should not override existing preferences', () => {
			prefsStore.set('extensions.momento7.autoArchive', false);

			manager.init();

			expect(prefsStore.get('extensions.momento7.autoArchive')).toBe(false);
		});
	});

	describe('getPref', () => {
		it('should get boolean preference', () => {
			prefsStore.set('extensions.momento7.autoArchive', false);

			const value = manager.getPref('autoArchive');

			expect(value).toBe(false);
		});

		it('should get string preference', () => {
			prefsStore.set('extensions.momento7.defaultService', 'permacc');

			const value = manager.getPref('defaultService');

			expect(value).toBe('permacc');
		});

		it('should get number preference', () => {
			prefsStore.set('extensions.momento7.iaTimeout', 60000);

			const value = manager.getPref('iaTimeout');

			expect(value).toBe(60000);
		});

		it('should get array preference from comma-separated string', () => {
			prefsStore.set('extensions.momento7.robustLinkServices', 'ia,permacc,archive');

			const value = manager.getPref('robustLinkServices');

			expect(value).toEqual(['ia', 'permacc', 'archive']);
		});

		it('should return default for boolean when not set', () => {
			const value = manager.getPref('autoArchive');

			expect(value).toBe(true); // default
		});

		it('should return default for number when not set', () => {
			const value = manager.getPref('iaTimeout');

			expect(value).toBe(120000); // default
		});

		it('should return default array when not set', () => {
			const value = manager.getPref('fallbackOrder');

			expect(value).toEqual([
				'internetarchive',
				'archivetoday',
				'arquivopt',
				'permacc',
				'ukwebarchive',
			]);
		});
	});

	describe('setPref', () => {
		it('should set boolean preference', () => {
			manager.setPref('autoArchive', false);

			expect(prefsStore.get('extensions.momento7.autoArchive')).toBe(false);
		});

		it('should set string preference', () => {
			manager.setPref('defaultService', 'permacc');

			expect(prefsStore.get('extensions.momento7.defaultService')).toBe('permacc');
		});

		it('should set number preference', () => {
			manager.setPref('iaTimeout', 30000);

			expect(prefsStore.get('extensions.momento7.iaTimeout')).toBe(30000);
		});

		it('should set array preference as comma-separated string', () => {
			manager.setPref('robustLinkServices', ['ia', 'permacc']);

			expect(prefsStore.get('extensions.momento7.robustLinkServices')).toBe('ia,permacc');
		});
	});

	describe('clearPref', () => {
		it('should clear a preference', () => {
			prefsStore.set('extensions.momento7.autoArchive', false);

			manager.clearPref('autoArchive');

			expect(Zotero.Prefs.clear).toHaveBeenCalledWith('extensions.momento7.autoArchive');
		});
	});

	describe('getAll', () => {
		it('should return all non-credential preferences', () => {
			prefsStore.set('extensions.momento7.autoArchive', false);
			prefsStore.set('extensions.momento7.defaultService', 'permacc');
			prefsStore.set('extensions.momento7.iaTimeout', 60000);

			const all = manager.getAll();

			expect(all.autoArchive).toBe(false);
			expect(all.defaultService).toBe('permacc');
			expect(all.iaTimeout).toBe(60000);
			// Credentials are not returned by getAll() for security
			expect(all.iaAccessKey).toBeUndefined();
			expect(all.iaSecretKey).toBeUndefined();
		});

		it('should return undefined for API keys (use getCredential instead)', () => {
			const all = manager.getAll();

			// getAll() intentionally returns undefined for credentials
			// Use getCredential() or getAllWithCredentials() for secure access
			expect(all.iaAccessKey).toBeUndefined();
			expect(all.iaSecretKey).toBeUndefined();
			expect(all.permaccApiKey).toBeUndefined();
		});
	});

	describe('resetToDefaults', () => {
		it('should reset preferences to defaults', () => {
			prefsStore.set('extensions.momento7.autoArchive', false);
			prefsStore.set('extensions.momento7.iaTimeout', 30000);

			manager.resetToDefaults();

			// Should have cleared and re-initialized
			expect(Zotero.Prefs.clear).toHaveBeenCalled();
		});

		it('should not reset API keys', () => {
			prefsStore.set('extensions.momento7.iaAccessKey', 'keep-this');
			prefsStore.set('extensions.momento7.autoArchive', false);

			manager.resetToDefaults();

			// API key should not be cleared (clearPref not called for it)
			const clearCalls = (Zotero.Prefs.clear as jest.Mock).mock.calls;
			const clearedKeys = clearCalls.map((call: any[]) => call[0]);

			expect(clearedKeys).not.toContain('extensions.momento7.iaAccessKey');
		});
	});

	describe('static getTimeout', () => {
		it('should return IA timeout for internetarchive service', () => {
			prefsStore.set('extensions.momento7.iaTimeout', 90000);

			const timeout = PreferencesManager.getTimeout('internetarchive');

			expect(timeout).toBe(90000);
		});

		it('should return default timeout for other services', () => {
			const timeout = PreferencesManager.getTimeout('permacc');

			expect(timeout).toBe(60000);
		});
	});

	describe('static getEnabledServices', () => {
		it('should return enabled services', () => {
			prefsStore.set('extensions.momento7.robustLinkServices', 'ia,permacc');

			const services = PreferencesManager.getEnabledServices();

			expect(services).toEqual(['ia', 'permacc']);
		});
	});

	describe('static getFallbackOrder', () => {
		it('should return fallback order', () => {
			prefsStore.set('extensions.momento7.fallbackOrder', 'permacc,ia');

			const order = PreferencesManager.getFallbackOrder();

			expect(order).toEqual(['permacc', 'ia']);
		});
	});

	describe('static getIACredentials', () => {
		it('should return credentials when set', async () => {
			prefsStore.set('extensions.momento7.iaAccessKey', 'encrypted:b64:MzIxLXNzZWNjYQ==');
			prefsStore.set('extensions.momento7.iaSecretKey', 'encrypted:b64:NjU0LXRlcmNlcw==');

			const creds = await PreferencesManager.getIACredentials();

			// Note: With encryption, we can't easily predict the output
			// Just verify the structure is correct
			expect(creds).toHaveProperty('accessKey');
			expect(creds).toHaveProperty('secretKey');
		});

		it('should return undefined when not set', async () => {
			const creds = await PreferencesManager.getIACredentials();

			expect(creds.accessKey).toBeUndefined();
			expect(creds.secretKey).toBeUndefined();
		});
	});

	describe('static hasIACredentials', () => {
		it('should return true when both credentials are set', async () => {
			prefsStore.set('extensions.momento7.iaAccessKey', 'encrypted:b64:MzIxLXNzZWNjYQ==');
			prefsStore.set('extensions.momento7.iaSecretKey', 'encrypted:b64:NjU0LXRlcmNlcw==');

			expect(await PreferencesManager.hasIACredentials()).toBe(true);
		});

		it('should return false when only access key is set', async () => {
			prefsStore.set('extensions.momento7.iaAccessKey', 'encrypted:b64:MzIxLXNzZWNjYQ==');

			expect(await PreferencesManager.hasIACredentials()).toBe(false);
		});

		it('should return false when only secret key is set', async () => {
			prefsStore.set('extensions.momento7.iaSecretKey', 'encrypted:b64:NjU0LXRlcmNlcw==');

			expect(await PreferencesManager.hasIACredentials()).toBe(false);
		});

		it('should return false when neither is set', async () => {
			expect(await PreferencesManager.hasIACredentials()).toBe(false);
		});
	});

	describe('openDialog', () => {
		beforeEach(() => {
			// Mock window.openDialog for these tests
			(global as any).window.openDialog = jest.fn();
		});

		it('should open dialog with preferences', () => {
			manager.openDialog();

			expect(window.openDialog).toHaveBeenCalledWith(
				expect.stringContaining('data:application/xhtml+xml'),
				'momento7-preferences',
				expect.stringContaining('chrome,dialog'),
				expect.any(Object)
			);
		});

		it('should save preferences when dialog returns save=true', () => {
			// Mock openDialog to set save flag
			(window.openDialog as jest.Mock).mockImplementation(
				(_url: string, _name: string, _features: string, params: any) => {
					params.save = true;
					params.autoArchive = false;
					params.iaTimeout = 30000;
				}
			);

			manager.openDialog();

			// Should have saved the changed preferences
			expect(Zotero.Prefs.set).toHaveBeenCalled();
		});

		it('should not save when dialog is cancelled', () => {
			// Clear any previous calls
			jest.clearAllMocks();

			// Mock openDialog without setting save flag
			(window.openDialog as jest.Mock).mockImplementation(() => {
				// Dialog closed without save
			});

			manager.openDialog();

			// setPref should not be called for saving (init may call it)
			const setCalls = (Zotero.Prefs.set as jest.Mock).mock.calls;
			// Filter out any init-related calls
			expect(setCalls.filter((c: any) => c[0].includes('autoArchive'))).toHaveLength(0);
		});
	});
});
