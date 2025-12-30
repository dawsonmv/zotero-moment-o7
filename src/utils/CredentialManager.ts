/**
 * Secure credential storage for Zotero Moment-o7
 * Uses AES-GCM encryption with a profile-derived key
 */

export class CredentialManager {
	private static instance: CredentialManager;
	private encryptionKey: CryptoKey | null = null;
	private readonly ALGORITHM = 'AES-GCM';
	private readonly KEY_PREFIX = 'encrypted:';

	private constructor() {}

	static getInstance(): CredentialManager {
		if (!CredentialManager.instance) {
			CredentialManager.instance = new CredentialManager();
		}
		return CredentialManager.instance;
	}

	/**
	 * Initialize encryption key derived from profile-specific data
	 */
	async init(): Promise<void> {
		if (this.encryptionKey) return;

		try {
			// Derive key from profile path + fixed salt
			// This ensures credentials are tied to this specific Zotero profile
			const profileId = this.getProfileIdentifier();
			const salt = new TextEncoder().encode('momento7-credential-salt-v1');

			// Import the profile ID as key material
			const keyMaterial = await crypto.subtle.importKey(
				'raw',
				new TextEncoder().encode(profileId),
				'PBKDF2',
				false,
				['deriveBits', 'deriveKey']
			);

			// Derive the actual encryption key
			this.encryptionKey = await crypto.subtle.deriveKey(
				{
					name: 'PBKDF2',
					salt,
					iterations: 100000,
					hash: 'SHA-256',
				},
				keyMaterial,
				{ name: this.ALGORITHM, length: 256 },
				false,
				['encrypt', 'decrypt']
			);

			Zotero.debug('MomentO7: CredentialManager initialized');
		} catch (error) {
			Zotero.debug(`MomentO7: CredentialManager init failed: ${error}`);
			// Fallback: credentials will be stored with basic obfuscation
			this.encryptionKey = null;
		}
	}

	/**
	 * Get a profile-specific identifier for key derivation
	 */
	private getProfileIdentifier(): string {
		// Use profile directory as unique identifier
		// This ties credentials to this specific Zotero profile
		try {
			const profileDir = Zotero.Profile?.dir || Zotero.DataDirectory?.dir || 'default-profile';
			return `momento7:${profileDir}`;
		} catch {
			return 'momento7:fallback-profile';
		}
	}

	/**
	 * Store a credential securely
	 */
	async storeCredential(key: string, value: string): Promise<void> {
		if (!value) {
			// Clear the credential
			Zotero.Prefs.clear(`extensions.momento7.${key}`);
			return;
		}

		await this.init();

		if (this.encryptionKey) {
			try {
				const encrypted = await this.encrypt(value);
				Zotero.Prefs.set(`extensions.momento7.${key}`, this.KEY_PREFIX + encrypted);
				return;
			} catch (error) {
				Zotero.debug(`MomentO7: Encryption failed for ${key}: ${error}`);
			}
		}

		// Fallback: basic obfuscation (base64) - better than plaintext
		const obfuscated = this.obfuscate(value);
		Zotero.Prefs.set(`extensions.momento7.${key}`, this.KEY_PREFIX + 'b64:' + obfuscated);
	}

	/**
	 * Retrieve a credential
	 */
	async getCredential(key: string): Promise<string | undefined> {
		const stored = Zotero.Prefs.get(`extensions.momento7.${key}`);
		if (!stored) return undefined;

		// Check if value is encrypted
		if (typeof stored === 'string' && stored.startsWith(this.KEY_PREFIX)) {
			const encrypted = stored.substring(this.KEY_PREFIX.length);

			// Check for base64 fallback
			if (encrypted.startsWith('b64:')) {
				return this.deobfuscate(encrypted.substring(4));
			}

			// Decrypt with AES-GCM
			await this.init();
			if (this.encryptionKey) {
				try {
					return await this.decrypt(encrypted);
				} catch (error) {
					Zotero.debug(`MomentO7: Decryption failed for ${key}: ${error}`);
					return undefined;
				}
			}
		}

		// Legacy: return plaintext value and migrate on next save
		return typeof stored === 'string' ? stored : undefined;
	}

	/**
	 * Check if a credential exists
	 */
	async hasCredential(key: string): Promise<boolean> {
		const value = await this.getCredential(key);
		return !!value;
	}

	/**
	 * Migrate plaintext credentials to encrypted storage
	 */
	async migrateIfNeeded(): Promise<void> {
		const credentialKeys = ['iaAccessKey', 'iaSecretKey', 'permaccApiKey', 'orcidApiKey'];

		for (const key of credentialKeys) {
			const stored = Zotero.Prefs.get(`extensions.momento7.${key}`);
			if (stored && typeof stored === 'string' && !stored.startsWith(this.KEY_PREFIX)) {
				// Plaintext credential found, migrate it
				Zotero.debug(`MomentO7: Migrating plaintext credential: ${key}`);
				await this.storeCredential(key, stored);
			}
		}
	}

	/**
	 * Encrypt a string using AES-GCM
	 */
	private async encrypt(plaintext: string): Promise<string> {
		if (!this.encryptionKey) throw new Error('Encryption key not initialized');

		// Generate random IV
		const iv = crypto.getRandomValues(new Uint8Array(12));

		// Encrypt
		const encoded = new TextEncoder().encode(plaintext);
		const ciphertext = await crypto.subtle.encrypt(
			{ name: this.ALGORITHM, iv },
			this.encryptionKey,
			encoded
		);

		// Combine IV + ciphertext and base64 encode
		const combined = new Uint8Array(iv.length + ciphertext.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(ciphertext), iv.length);

		return this.arrayBufferToBase64(combined);
	}

	/**
	 * Decrypt a string using AES-GCM
	 */
	private async decrypt(encrypted: string): Promise<string> {
		if (!this.encryptionKey) throw new Error('Encryption key not initialized');

		// Decode and extract IV + ciphertext
		const combined = this.base64ToArrayBuffer(encrypted);
		const iv = combined.slice(0, 12);
		const ciphertext = combined.slice(12);

		// Decrypt
		const decrypted = await crypto.subtle.decrypt(
			{ name: this.ALGORITHM, iv },
			this.encryptionKey,
			ciphertext
		);

		return new TextDecoder().decode(decrypted);
	}

	/**
	 * Basic obfuscation fallback (base64 with reversal)
	 */
	private obfuscate(value: string): string {
		// Reverse + base64 - not secure but better than plaintext
		const reversed = value.split('').reverse().join('');
		return btoa(reversed);
	}

	/**
	 * Deobfuscate basic obfuscation
	 */
	private deobfuscate(value: string): string {
		try {
			const decoded = atob(value);
			return decoded.split('').reverse().join('');
		} catch {
			return '';
		}
	}

	/**
	 * Convert ArrayBuffer to base64 string
	 */
	private arrayBufferToBase64(buffer: Uint8Array): string {
		let binary = '';
		for (let i = 0; i < buffer.length; i++) {
			binary += String.fromCharCode(buffer[i]);
		}
		return btoa(binary);
	}

	/**
	 * Convert base64 string to Uint8Array
	 */
	private base64ToArrayBuffer(base64: string): Uint8Array {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}
}
