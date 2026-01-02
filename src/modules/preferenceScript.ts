import { config } from "../../package.json";
import { CredentialManager } from "../utils/CredentialManager";
import { PreferencesPanel } from "./preferences/ui/PreferencesPanel";
import { PreferencesManager } from "./preferences/PreferencesManager";

/**
 * Preference panel instance
 */
let preferencesPanel: PreferencesPanel | null = null;

/**
 * Register preference window scripts
 * Called when the preferences window is opened
 */
export async function registerPrefsScripts(_window: Window): Promise<void> {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
      preferencesPanel: null,
    };
  } else {
    addon.data.prefs.window = _window;
  }

  // Try to initialize the modern PreferencesPanel
  try {
    await initPreferencesPanelUI(_window);
  } catch (error) {
    ztoolkit.log(`Failed to initialize PreferencesPanel: ${error}`);
    // Fall back to legacy XUL-based preferences
    await initPrefsUI(_window);
    bindPrefEvents(_window);
  }

  // Register cleanup handler for window unload
  _window.addEventListener("unload", () => {
    if (preferencesPanel) {
      preferencesPanel.close();
      preferencesPanel = null;
    }
    if (addon.data.prefs) {
      addon.data.prefs.preferencesPanel = null;
    }
  });
}

/**
 * Initialize modern PreferencesPanel UI
 */
async function initPreferencesPanelUI(_window: Window): Promise<void> {
  const doc = _window.document;
  if (!doc) {
    throw new Error("Document not available");
  }

  // Find the container element
  const container = doc.querySelector("#momento7-preferences-panel-container");
  if (!container) {
    throw new Error("Preferences panel container not found");
  }

  // Initialize preferences manager if not already done
  const prefsManager = PreferencesManager.getInstance();
  await prefsManager.init();

  // Create and initialize the PreferencesPanel
  preferencesPanel = new PreferencesPanel({
    container: container as HTMLElement,
    window: _window,
    onSave: async (changes: Record<string, unknown>) => {
      await onPreferencesSave(changes);
    },
    onClose: () => {
      onPreferencesClose();
    },
  });

  // Initialize the panel (loads preferences)
  await preferencesPanel.initialize();

  // Store reference in addon data
  if (addon.data.prefs) {
    addon.data.prefs.preferencesPanel = preferencesPanel;
  }

  ztoolkit.log("Modern PreferencesPanel initialized successfully");
}

/**
 * Handle preferences save
 */
async function onPreferencesSave(
  changes: Record<string, unknown>,
): Promise<void> {
  try {
    const prefsManager = PreferencesManager.getInstance();

    // Map preference keys to manager keys
    const keyMapping: Record<string, string> = {
      enabledServices: "robustLinkServices",
      fallbackOrder: "fallbackOrder",
      timeout: "iaTimeout",
      checkBeforeArchive: "checkBeforeArchive",
      archiveAgeThreshold: "archiveAgeThresholdHours",
      autoArchive: "autoArchive",
    };

    // Save each preference change
    for (const [key, value] of Object.entries(changes)) {
      const prefKey = keyMapping[key] || key;

      // Skip credentials - they're handled separately by CredentialManager
      if (key === "credentials") {
        continue;
      }

      // Only save if key exists in preferences
      if (prefKey in keyMapping || key.match(/^[a-zA-Z]/)) {
        try {
          // Use setPref with type casting for known preference keys
          (prefsManager as any).setPref(prefKey, value);
        } catch {
          ztoolkit.log(`Warning: Could not save preference ${prefKey}`);
        }
      }
    }

    ztoolkit.log("Preferences saved successfully");
  } catch (error) {
    ztoolkit.log(`Error saving preferences: ${error}`);
    throw error;
  }
}

/**
 * Handle preferences panel close
 */
function onPreferencesClose(): void {
  ztoolkit.log("Preferences panel closed");
  // Any cleanup needed when panel closes
}

/**
 * Initialize preference UI elements (legacy XUL-based)
 */
async function initPrefsUI(_window: Window): Promise<void> {
  const doc = _window.document;
  if (!doc) return;

  // Load existing credentials (masked)
  const credManager = CredentialManager.getInstance();
  await credManager.init();

  // Check if IA credentials exist and show masked indicator
  const hasIACredentials = await credManager.hasCredential("iaAccessKey");
  if (hasIACredentials) {
    const accessKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-access-key`,
    ) as HTMLInputElement;
    const secretKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-secret-key`,
    ) as HTMLInputElement;
    if (accessKeyInput) accessKeyInput.placeholder = "••••••••";
    if (secretKeyInput) secretKeyInput.placeholder = "••••••••";
  }

  // Check if Perma.cc key exists
  const hasPermaCCKey = await credManager.hasCredential("permaCCApiKey");
  if (hasPermaCCKey) {
    const permaCCInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-permacc-key`,
    ) as HTMLInputElement;
    if (permaCCInput) permaCCInput.placeholder = "••••••••";
  }

  ztoolkit.log("Moment-o7 preferences UI initialized");
}

/**
 * Bind event handlers to preference elements
 */
function bindPrefEvents(_window: Window): void {
  const doc = _window.document;
  if (!doc) return;

  // Auto-archive checkbox
  const autoArchiveCheckbox = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-auto-archive`,
  );
  autoArchiveCheckbox?.addEventListener("command", (e: Event) => {
    const checked = (e.target as XUL.Checkbox).checked;
    ztoolkit.log(`Auto-archive set to: ${checked}`);
  });

  // Default service select
  const serviceSelect = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-default-service`,
  );
  serviceSelect?.addEventListener("command", (e: Event) => {
    const value = (e.target as XUL.MenuList).value;
    ztoolkit.log(`Default service set to: ${value}`);
  });

  // Internet Archive credential buttons
  const iaSaveBtn = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-ia-save`,
  );
  iaSaveBtn?.addEventListener("click", () => saveIACredentials(doc));

  const iaClearBtn = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-ia-clear`,
  );
  iaClearBtn?.addEventListener("click", () => clearIACredentials(doc));

  // Perma.cc credential buttons
  const permaCCSaveBtn = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-permacc-save`,
  );
  permaCCSaveBtn?.addEventListener("click", () => savePermaCCCredentials(doc));

  const permaCCClearBtn = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-permacc-clear`,
  );
  permaCCClearBtn?.addEventListener("click", () =>
    clearPermaCCCredentials(doc),
  );
}

/**
 * Save Internet Archive credentials
 */
async function saveIACredentials(doc: Document): Promise<void> {
  const accessKeyInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-ia-access-key`,
  ) as HTMLInputElement;
  const secretKeyInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-ia-secret-key`,
  ) as HTMLInputElement;

  const accessKey = accessKeyInput?.value?.trim();
  const secretKey = secretKeyInput?.value?.trim();

  if (!accessKey || !secretKey) {
    showCredentialStatus(
      doc,
      "ia",
      "Please enter both access key and secret key",
      "error",
    );
    return;
  }

  try {
    const credManager = CredentialManager.getInstance();
    await credManager.storeCredential("iaAccessKey", accessKey);
    await credManager.storeCredential("iaSecretKey", secretKey);

    // Clear inputs and show success
    accessKeyInput.value = "";
    secretKeyInput.value = "";
    accessKeyInput.placeholder = "••••••••";
    secretKeyInput.placeholder = "••••••••";

    showCredentialStatus(
      doc,
      "ia",
      "Credentials saved successfully",
      "success",
    );
    ztoolkit.log("Internet Archive credentials saved");
  } catch (error) {
    showCredentialStatus(
      doc,
      "ia",
      `Error saving credentials: ${error}`,
      "error",
    );
    ztoolkit.log(`Error saving IA credentials: ${error}`);
  }
}

/**
 * Clear Internet Archive credentials
 */
async function clearIACredentials(doc: Document): Promise<void> {
  try {
    const credManager = CredentialManager.getInstance();
    await credManager.storeCredential("iaAccessKey", "");
    await credManager.storeCredential("iaSecretKey", "");

    const accessKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-access-key`,
    ) as HTMLInputElement;
    const secretKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-ia-secret-key`,
    ) as HTMLInputElement;

    if (accessKeyInput) {
      accessKeyInput.value = "";
      accessKeyInput.placeholder = "";
    }
    if (secretKeyInput) {
      secretKeyInput.value = "";
      secretKeyInput.placeholder = "";
    }

    showCredentialStatus(doc, "ia", "Credentials cleared", "success");
    ztoolkit.log("Internet Archive credentials cleared");
  } catch (error) {
    showCredentialStatus(
      doc,
      "ia",
      `Error clearing credentials: ${error}`,
      "error",
    );
  }
}

/**
 * Save Perma.cc credentials
 */
async function savePermaCCCredentials(doc: Document): Promise<void> {
  const apiKeyInput = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-permacc-key`,
  ) as HTMLInputElement;

  const apiKey = apiKeyInput?.value?.trim();

  if (!apiKey) {
    showCredentialStatus(doc, "permacc", "Please enter an API key", "error");
    return;
  }

  try {
    const credManager = CredentialManager.getInstance();
    await credManager.storeCredential("permaCCApiKey", apiKey);

    // Clear input and show success
    apiKeyInput.value = "";
    apiKeyInput.placeholder = "••••••••";

    showCredentialStatus(
      doc,
      "permacc",
      "API key saved successfully",
      "success",
    );
    ztoolkit.log("Perma.cc API key saved");
  } catch (error) {
    showCredentialStatus(
      doc,
      "permacc",
      `Error saving API key: ${error}`,
      "error",
    );
    ztoolkit.log(`Error saving Perma.cc API key: ${error}`);
  }
}

/**
 * Clear Perma.cc credentials
 */
async function clearPermaCCCredentials(doc: Document): Promise<void> {
  try {
    const credManager = CredentialManager.getInstance();
    await credManager.storeCredential("permaCCApiKey", "");

    const apiKeyInput = doc.querySelector(
      `#zotero-prefpane-${config.addonRef}-permacc-key`,
    ) as HTMLInputElement;

    if (apiKeyInput) {
      apiKeyInput.value = "";
      apiKeyInput.placeholder = "";
    }

    showCredentialStatus(doc, "permacc", "API key cleared", "success");
    ztoolkit.log("Perma.cc API key cleared");
  } catch (error) {
    showCredentialStatus(
      doc,
      "permacc",
      `Error clearing API key: ${error}`,
      "error",
    );
  }
}

/**
 * Show credential status message
 */
function showCredentialStatus(
  doc: Document,
  section: "ia" | "permacc",
  message: string,
  type: "success" | "error",
): void {
  // Use a simple progress window notification
  const progressWin = new ztoolkit.ProgressWindow(config.addonName, {
    closeOnClick: true,
    closeTime: 3000,
  });
  progressWin.createLine({
    text: message,
    type: type === "success" ? "success" : "fail",
  });
  progressWin.show();
}
