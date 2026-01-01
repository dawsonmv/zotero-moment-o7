/**
 * Archive Service Configuration UI - Main Preferences Panel
 *
 * Manages the overall preferences panel layout and coordinates between
 * service configuration, credentials management, and general preferences.
 *
 * @module PreferencesPanel
 */

import { PreferencesManager } from "../PreferencesManager";
import { HealthChecker } from "../../monitoring/HealthChecker";

/**
 * Main preferences panel controller
 *
 * Responsibilities:
 * - Render preferences panel UI
 * - Coordinate between preference sections
 * - Handle save/cancel actions
 * - Persist preference changes
 */
export class PreferencesPanel {
  private container: HTMLElement | null = null;
  private serviceSection: ServiceConfigSection | null = null;
  private credentialsSection: CredentialsSection | null = null;
  private preferencesSection: PreferencesSection | null = null;
  private healthChecker: HealthChecker;

  constructor() {
    this.healthChecker = HealthChecker.getInstance();
  }

  /**
   * Initialize and render the preferences panel
   *
   * @throws Error if container element not found
   */
  async initialize(): Promise<void> {
    // Get or create container element
    this.container = document.getElementById("momento7-preferences");
    if (!this.container) {
      throw new Error("Preferences container not found");
    }

    // Render main panel structure
    await this.render();

    // Bind event handlers
    this.bindEventHandlers();
  }

  /**
   * Render the preferences panel UI
   */
  private async render(): Promise<void> {
    if (!this.container) return;

    // Create panel sections
    this.serviceSection = new ServiceConfigSection(this.healthChecker);
    this.credentialsSection = new CredentialsSection();
    this.preferencesSection = new PreferencesSection();

    // Render each section
    await Promise.all([
      this.serviceSection.render(this.container),
      this.credentialsSection.render(this.container),
      this.preferencesSection.render(this.container),
    ]);

    // Add action buttons
    this.renderActionButtons();
  }

  /**
   * Render save/cancel buttons
   */
  private renderActionButtons(): void {
    if (!this.container) return;

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "momento7-action-buttons";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "momento7-btn momento7-btn-primary";
    saveBtn.addEventListener("click", () => this.onSave());

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.className = "momento7-btn momento7-btn-secondary";
    cancelBtn.addEventListener("click", () => this.onCancel());

    buttonGroup.appendChild(saveBtn);
    buttonGroup.appendChild(cancelBtn);
    this.container.appendChild(buttonGroup);
  }

  /**
   * Bind event handlers for preference changes
   */
  private bindEventHandlers(): void {
    if (!this.serviceSection || !this.credentialsSection || !this.preferencesSection) {
      return;
    }

    // Service section events
    this.serviceSection.on("serviceToggle", (serviceId: string, enabled: boolean) => {
      this.onServiceToggle(serviceId, enabled);
    });

    this.serviceSection.on("serviceReorder", (order: string[]) => {
      this.onServiceReorder(order);
    });

    this.serviceSection.on("testConnection", (serviceId: string) => {
      this.onTestConnection(serviceId);
    });

    // Credential section events
    this.credentialsSection.on("credentialUpdate", (serviceId: string, credentials: any) => {
      this.onCredentialUpdate(serviceId, credentials);
    });

    this.credentialsSection.on("credentialTest", (serviceId: string) => {
      this.onTestCredentials(serviceId);
    });
  }

  /**
   * Handle service enable/disable toggle
   */
  private onServiceToggle(serviceId: string, enabled: boolean): void {
    const enabledServices = PreferencesManager.getEnabledServices();
    const index = enabledServices.indexOf(serviceId);

    if (enabled && index === -1) {
      enabledServices.push(serviceId);
    } else if (!enabled && index !== -1) {
      enabledServices.splice(index, 1);
    }

    // Note: Actual persistence happens in onSave()
  }

  /**
   * Handle service priority reordering
   */
  private onServiceReorder(order: string[]): void {
    // Note: Actual persistence happens in onSave()
  }

  /**
   * Handle service connection test
   */
  private async onTestConnection(serviceId: string): Promise<void> {
    if (!this.serviceSection) return;

    try {
      this.serviceSection.setTestLoading(serviceId, true);

      // Test service availability via health checker
      const isAvailable = await this.healthChecker.checkService(serviceId);

      this.serviceSection.setTestResult(serviceId, isAvailable);
    } catch (error) {
      Zotero.debug(`Momento7: Service test failed for ${serviceId}: ${error}`);
      this.serviceSection.setTestResult(serviceId, false, error instanceof Error ? error.message : String(error));
    } finally {
      this.serviceSection.setTestLoading(serviceId, false);
    }
  }

  /**
   * Handle credential update
   */
  private onCredentialUpdate(serviceId: string, credentials: any): void {
    // Note: Actual persistence happens in onSave()
  }

  /**
   * Handle credential test
   */
  private async onTestCredentials(serviceId: string): Promise<void> {
    if (!this.credentialsSection) return;

    try {
      this.credentialsSection.setTestLoading(serviceId, true);

      // Test credentials with service
      const isValid = await this.testServiceCredentials(serviceId);

      this.credentialsSection.setTestResult(serviceId, isValid);
    } catch (error) {
      Zotero.debug(`Momento7: Credential test failed for ${serviceId}: ${error}`);
      this.credentialsSection.setTestResult(
        serviceId,
        false,
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      this.credentialsSection.setTestLoading(serviceId, false);
    }
  }

  /**
   * Test service credentials
   */
  private async testServiceCredentials(serviceId: string): Promise<boolean> {
    // This will be implemented to test actual credentials with each service
    // For now, just return true
    return true;
  }

  /**
   * Handle save action
   */
  private async onSave(): Promise<void> {
    try {
      // Get updated preferences from sections
      const preferences = {
        enabledServices: this.serviceSection?.getEnabledServices() || [],
        fallbackOrder: this.serviceSection?.getServiceOrder() || [],
        timeout: this.preferencesSection?.getTimeout() || 120000,
        checkBeforeArchive: this.preferencesSection?.getCheckBeforeArchive() || true,
        archiveAgeThreshold: this.preferencesSection?.getArchiveAgeThreshold() || 30 * 24 * 60 * 60 * 1000,
        autoArchive: this.preferencesSection?.getAutoArchive() || true,
      };

      // Persist preferences
      await this.persistPreferences(preferences);

      // Close preferences panel
      this.close();
    } catch (error) {
      Zotero.debug(`Momento7: Failed to save preferences: ${error}`);
      alert(`Failed to save preferences: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Persist preferences to storage
   */
  private async persistPreferences(prefs: any): Promise<void> {
    // Save to PreferencesManager
    const manager = PreferencesManager.getInstance();

    manager.setPref("enabledServices", prefs.enabledServices);
    manager.setPref("fallbackOrder", prefs.fallbackOrder);
    manager.setPref("timeout", prefs.timeout);
    manager.setPref("checkBeforeArchive", prefs.checkBeforeArchive);
    manager.setPref("archiveAgeThreshold", prefs.archiveAgeThreshold);
    manager.setPref("autoArchive", prefs.autoArchive);
  }

  /**
   * Handle cancel action
   */
  private onCancel(): void {
    this.close();
  }

  /**
   * Close preferences panel
   */
  close(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}

/**
 * Service configuration section
 *
 * Displays available archive services with enable/disable toggles,
 * health status, and ability to reorder fallback priority.
 */
export class ServiceConfigSection {
  private container: HTMLElement | null = null;
  private healthChecker: HealthChecker;
  private services: Map<string, HTMLElement> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(healthChecker: HealthChecker) {
    this.healthChecker = healthChecker;
  }

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement("div");
    this.container.className = "momento7-services-section";
    this.container.innerHTML = `
      <h3>Archive Services</h3>
      <p class="momento7-section-description">
        Enable or disable archive services and set their priority order.
      </p>
      <div class="momento7-services-list"></div>
    `;

    parent.appendChild(this.container);

    // Render service list
    await this.renderServiceList();
  }

  private async renderServiceList(): Promise<void> {
    const listContainer = this.container?.querySelector(".momento7-services-list") as HTMLElement;
    if (!listContainer) return;

    // This will be implemented to render actual service list
    // Placeholder for now
    listContainer.innerHTML = "<p>Loading services...</p>";
  }

  setTestLoading(serviceId: string, loading: boolean): void {
    // Placeholder
  }

  setTestResult(serviceId: string, success: boolean, error?: string): void {
    // Placeholder
  }

  getEnabledServices(): string[] {
    return [];
  }

  getServiceOrder(): string[] {
    return [];
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }
}

/**
 * Credentials section
 *
 * Manages credential input and storage for services requiring authentication.
 */
export class CredentialsSection {
  private container: HTMLElement | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement("div");
    this.container.className = "momento7-credentials-section";
    this.container.innerHTML = `
      <h3>Credentials</h3>
      <p class="momento7-section-description">
        Configure credentials for archive services that require authentication.
      </p>
      <div class="momento7-credentials-form"></div>
    `;

    parent.appendChild(this.container);
  }

  setTestLoading(serviceId: string, loading: boolean): void {
    // Placeholder
  }

  setTestResult(serviceId: string, success: boolean, error?: string): void {
    // Placeholder
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }
}

/**
 * General preferences section
 *
 * Manages global archiving preferences like timeouts, auto-archive,
 * and memento checking.
 */
export class PreferencesSection {
  private container: HTMLElement | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  async render(parent: HTMLElement): Promise<void> {
    this.container = document.createElement("div");
    this.container.className = "momento7-preferences-section";
    this.container.innerHTML = `
      <h3>Preferences</h3>
      <p class="momento7-section-description">
        Configure archiving behavior and preferences.
      </p>
      <div class="momento7-preferences-form"></div>
    `;

    parent.appendChild(this.container);
  }

  getTimeout(): number {
    return 120000;
  }

  getCheckBeforeArchive(): boolean {
    return true;
  }

  getArchiveAgeThreshold(): number {
    return 30 * 24 * 60 * 60 * 1000;
  }

  getAutoArchive(): boolean {
    return true;
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }
}
