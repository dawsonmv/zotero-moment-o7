/**
 * Secure credential storage using Firefox's nsILoginManager
 * Leverages OS-native secure storage:
 * - macOS: Keychain integration
 * - Windows: Windows Credential Manager
 * - Linux: Secret Service API / GNOME Keyring
 *
 * This replaces the insecure base64 fallback with a battle-tested,
 * industry-standard solution used by Firefox for all password storage.
 */

export class SecureCredentialStorage {
  private static readonly ORIGIN = "chrome://zotero";
  private static readonly REALM = "Momento7 Credentials";

  /**
   * Store credential securely using nsILoginManager
   * Creates or updates a credential in the OS keychain
   */
  static async set(key: string, value: string): Promise<void> {
    if (!key || !value) {
      throw new Error("Credential key and value are required");
    }

    try {
      // Create nsILoginInfo object
      const loginInfo = (Components as any).classes[
        "@mozilla.org/login-manager/loginInfo;1"
      ].createInstance((Components as any).interfaces.nsILoginInfo);

      loginInfo.init(
        this.ORIGIN, // origin: identifies the storage location
        null, // formActionOrigin: not used for generic credentials
        this.REALM, // httpRealm: identifies the credential set
        key, // username: credential key (e.g., "iaAccessKey")
        value, // password: credential value (the actual API key)
        "", // usernameField: not used
        "", // passwordField: not used
      );

      // Check if credential already exists
      const existing = await this.get(key);
      if (existing !== undefined) {
        // Update existing credential
        const oldLogins = await Services.logins.searchLoginsAsync({
          origin: this.ORIGIN,
          httpRealm: this.REALM,
        });

        const oldLogin = oldLogins.find((login: any) => login.username === key);
        if (oldLogin) {
          Services.logins.modifyLogin(oldLogin, loginInfo);
          Zotero.debug(`MomentO7: Updated credential ${key} in secure storage`);
          return;
        }
      }

      // Add new credential
      await Services.logins.addLoginAsync(loginInfo);
      Zotero.debug(`MomentO7: Stored credential ${key} in secure storage`);
    } catch (error) {
      Zotero.debug(`MomentO7: Failed to store credential ${key}: ${error}`);
      throw new Error(
        `Failed to store credential: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve credential from nsILoginManager
   * Returns undefined if credential not found
   */
  static async get(key: string): Promise<string | undefined> {
    if (!key) return undefined;

    try {
      const logins = await Services.logins.searchLoginsAsync({
        origin: this.ORIGIN,
        httpRealm: this.REALM,
      });

      const login = logins.find((login: any) => login.username === key);
      return login?.password;
    } catch (error) {
      Zotero.debug(`MomentO7: Failed to retrieve credential ${key}: ${error}`);
      return undefined;
    }
  }

  /**
   * Delete credential from nsILoginManager
   * Removes the credential from the OS keychain
   */
  static async delete(key: string): Promise<void> {
    if (!key) return;

    try {
      const logins = await Services.logins.searchLoginsAsync({
        origin: this.ORIGIN,
        httpRealm: this.REALM,
      });

      const login = logins.find((login: any) => login.username === key);
      if (login) {
        Services.logins.removeLogin(login);
        Zotero.debug(`MomentO7: Deleted credential ${key} from secure storage`);
      }
    } catch (error) {
      Zotero.debug(`MomentO7: Failed to delete credential ${key}: ${error}`);
    }
  }

  /**
   * Clear all Momento7 credentials from nsILoginManager
   * Removes all credentials in the Momento7 Credentials set
   */
  static async clear(): Promise<void> {
    try {
      const logins = await Services.logins.searchLoginsAsync({
        origin: this.ORIGIN,
        httpRealm: this.REALM,
      });

      for (const login of logins) {
        Services.logins.removeLogin(login);
      }

      Zotero.debug(
        `MomentO7: Cleared all ${logins.length} credentials from secure storage`,
      );
    } catch (error) {
      Zotero.debug(`MomentO7: Failed to clear credentials: ${error}`);
    }
  }

  /**
   * Check if any credentials exist
   * Useful for determining if credentials have been set up
   */
  static async exists(key: string): Promise<boolean> {
    const credential = await this.get(key);
    return credential !== undefined;
  }
}
