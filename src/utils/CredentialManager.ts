/**
 * Secure credential storage for Zotero Moment-o7
 * Uses Firefox's nsILoginManager for OS-native secure storage:
 * - macOS: Keychain integration
 * - Windows: Windows Credential Manager
 * - Linux: Secret Service API / GNOME Keyring
 *
 * Replaces previous Web Crypto AES-GCM implementation with a more robust,
 * industry-standard solution that doesn't rely on fallback mechanisms.
 */

import { SecureCredentialStorage } from "./SecureCredentialStorage";

export class CredentialManager {
  private static instance: CredentialManager;
  private migrationComplete = false;

  private constructor() {}

  static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  /**
   * Get a profile-specific identifier for key derivation
   * Used only for migration of old encrypted credentials
   */
  private getProfileIdentifier(): string {
    try {
      const zotero = Zotero as any;
      const profileDir =
        zotero.Profile?.dir || zotero.DataDirectory?.dir || "unknown";
      return `momento7:${profileDir}`;
    } catch {
      return "momento7:fallback-profile";
    }
  }

  /**
   * Store a credential securely using nsILoginManager
   * Replaces old encrypted storage with OS-native keychain
   */
  async set(key: string, value: string): Promise<void> {
    if (!key || !value) {
      throw new Error("Credential key and value are required");
    }

    await SecureCredentialStorage.set(key, value);

    // Clean up old Zotero.Prefs storage
    this.cleanupLegacyStorage(key);
  }

  /**
   * Retrieve a credential from nsILoginManager
   * Attempts to read from old storage for backward compatibility
   */
  async get(key: string): Promise<string | undefined> {
    if (!key) return undefined;

    return await SecureCredentialStorage.get(key);
  }

  /**
   * Delete a credential from nsILoginManager
   */
  async delete(key: string): Promise<void> {
    if (!key) return;

    await SecureCredentialStorage.delete(key);
    this.cleanupLegacyStorage(key);
  }

  /**
   * Clear all credentials from nsILoginManager
   */
  async clear(): Promise<void> {
    await SecureCredentialStorage.clear();

    // Clean up all legacy storage
    const legacyKeys = [
      "iaAccessKey",
      "iaSecretKey",
      "permaCCApiKey",
      "orcidApiKey",
    ];
    for (const key of legacyKeys) {
      this.cleanupLegacyStorage(key);
    }
  }

  /**
   * Check if a credential exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Compatibility method for old API
   */
  async storeCredential(key: string, value: string): Promise<void> {
    return this.set(key, value);
  }

  /**
   * Compatibility method for old API
   */
  async getCredential(key: string): Promise<string | undefined> {
    return this.get(key);
  }

  /**
   * Compatibility method for old API
   */
  async hasCredential(key: string): Promise<boolean> {
    return this.exists(key);
  }

  /**
   * Migrate credentials from old storage (Zotero.Prefs) to nsILoginManager
   * Handles all legacy formats: plaintext, base64 obfuscated, and encrypted
   */
  async migrateIfNeeded(): Promise<void> {
    if (this.migrationComplete) return;

    const credentialKeys = [
      "iaAccessKey",
      "iaSecretKey",
      "permaCCApiKey",
      "orcidApiKey",
    ];

    for (const key of credentialKeys) {
      const prefKey = `extensions.momento7.${key}`;
      const storedValue = Zotero.Prefs.get(prefKey);

      if (!storedValue || typeof storedValue !== "string") continue;

      try {
        let decryptedValue: string | undefined;

        if (storedValue.startsWith("encrypted:")) {
          // Old Web Crypto encrypted format - attempt to decrypt
          const encrypted = storedValue.substring(10); // Remove "encrypted:" prefix
          decryptedValue = await this.attemptDecryption(encrypted);

          if (!decryptedValue) {
            Zotero.debug(
              `MomentO7: Cannot decrypt credential ${key} - user must re-enter`,
            );
            continue;
          }
        } else if (storedValue.startsWith("b64:")) {
          // Old base64 obfuscated format
          const obfuscated = storedValue.substring(4);
          decryptedValue = this.deobfuscateBase64(obfuscated);
        } else {
          // Plaintext (legacy)
          decryptedValue = storedValue;
        }

        if (decryptedValue) {
          // Migrate to nsILoginManager
          await SecureCredentialStorage.set(key, decryptedValue);

          // Remove from Zotero.Prefs
          Zotero.Prefs.clear(prefKey);

          Zotero.debug(
            `MomentO7: Migrated credential ${key} to secure storage`,
          );
        }
      } catch (error) {
        Zotero.debug(`MomentO7: Failed to migrate credential ${key}: ${error}`);
      }
    }

    this.migrationComplete = true;
  }

  /**
   * Attempt to decrypt old Web Crypto encrypted credentials
   * Uses profile-based key derivation (same as old implementation)
   * Returns undefined if decryption fails
   */
  private async attemptDecryption(
    encryptedData: string,
  ): Promise<string | undefined> {
    try {
      // Reconstruct encryption key using profile path
      const profileId = this.getProfileIdentifier();
      const salt = new TextEncoder().encode("momento7-credential-salt-v1");

      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(profileId),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"],
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"],
      );

      // Parse encrypted data (base64-encoded: IV + ciphertext)
      const decoded = atob(encryptedData);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }

      const iv = bytes.slice(0, 12);
      const ciphertext = bytes.slice(12);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext,
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      Zotero.debug(`MomentO7: Decryption attempt failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Deobfuscate old base64-encoded credentials for migration
   */
  private deobfuscateBase64(value: string): string {
    try {
      const decoded = atob(value);
      return decoded.split("").reverse().join("");
    } catch {
      return "";
    }
  }

  /**
   * Remove legacy credential storage from Zotero.Prefs
   */
  private cleanupLegacyStorage(key: string): void {
    const prefKey = `extensions.momento7.${key}`;
    if (Zotero.Prefs.get(prefKey)) {
      Zotero.Prefs.clear(prefKey);
    }
  }
}
