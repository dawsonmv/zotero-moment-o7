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
import { ServiceRegistry } from "../../archive/ServiceRegistry";
import type { ArchiveService } from "../../archive/types";

declare const document: Document | undefined;
declare const Zotero: any;

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
    if (!document) {
      throw new Error("Document object not available in this environment");
    }
    this.container = document.getElementById("momento7-preferences") as HTMLElement | null;
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

    const buttonGroup = document!.createElement("div");
    buttonGroup.className = "momento7-action-buttons";

    const saveBtn = document!.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.className = "momento7-btn momento7-btn-primary";
    saveBtn.addEventListener("click", () => this.onSave());

    const cancelBtn = document!.createElement("button");
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

      // Test service availability - check if service is in available list
      const availableServices = this.healthChecker.getAvailableServices();
      const isAvailable = availableServices.includes(serviceId);

      this.serviceSection.setTestResult(serviceId, isAvailable);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      Zotero.debug(`Momento7: Service test failed for ${serviceId}: ${msg}`);
      this.serviceSection.setTestResult(serviceId, false, msg);
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
      const msg = error instanceof Error ? error.message : String(error);
      Zotero.debug(`Momento7: Failed to save preferences: ${msg}`);
      // Show error notification if available (Zotero environment)
      try {
        Zotero.showNotification?.(`Failed to save preferences: ${msg}`);
      } catch {
        // Silently fail if notification not available
      }
    }
  }

  /**
   * Persist preferences to storage
   */
  private async persistPreferences(prefs: any): Promise<void> {
    // Save to PreferencesManager
    const manager = PreferencesManager.getInstance();

    manager.setPref("robustLinkServices", prefs.enabledServices);
    manager.setPref("fallbackOrder", prefs.fallbackOrder);
    manager.setPref("iaTimeout", prefs.timeout);
    manager.setPref("checkBeforeArchive", prefs.checkBeforeArchive);
    manager.setPref("archiveAgeThresholdHours", prefs.archiveAgeThreshold);
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
  private enabledServices: Set<string> = new Set();
  private serviceOrder: string[] = [];
  private serviceStatus: Map<string, { available: boolean; checked: boolean; error?: string }> = new Map();
  private draggedServiceId: string | null = null;

  constructor(healthChecker: HealthChecker) {
    this.healthChecker = healthChecker;
  }

  async render(parent: HTMLElement): Promise<void> {
    this.container = document!.createElement("div");
    this.container.className = "momento7-section momento7-services-section";
    this.container.innerHTML = `
      <h3>📋 Archive Services</h3>
      <p class="momento7-section-description">
        Enable or disable archive services and set their priority order. Drag services to reorder.
      </p>
      <div class="momento7-services-list"></div>
    `;

    parent.appendChild(this.container);

    // Load initial state
    this.loadInitialState();

    // Render service list
    await this.renderServiceList();

    // Load initial health status
    await this.loadServiceStatus();
  }

  private loadInitialState(): void {
    this.enabledServices = new Set(PreferencesManager.getEnabledServices());
    this.serviceOrder = [...PreferencesManager.getFallbackOrder()];
  }

  private async loadServiceStatus(): Promise<void> {
    const registry = ServiceRegistry.getInstance();
    const entries = registry.getAll();

    const healthyServices = this.healthChecker.getHealthyServices();
    const availableServices = this.healthChecker.getAvailableServices();

    for (const { id } of entries) {
      const available = availableServices.includes(id);
      this.serviceStatus.set(id, {
        available,
        checked: true,
      });
    }
  }

  private async renderServiceList(): Promise<void> {
    const listContainer = this.container?.querySelector(".momento7-services-list") as HTMLElement;
    if (!listContainer) return;

    const registry = ServiceRegistry.getInstance();
    const entries = registry.getAll();

    // Sort services by current order, with unknown services at the end
    const sortedServices = entries.sort((a, b) => {
      const aIndex = this.serviceOrder.indexOf(a.id);
      const bIndex = this.serviceOrder.indexOf(b.id);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    listContainer.innerHTML = "";

    for (const { id, service } of sortedServices) {
      const serviceElement = this.createServiceElement(service);
      listContainer.appendChild(serviceElement);
      this.services.set(id, serviceElement);
    }
  }

  private createServiceElement(service: ArchiveService): HTMLElement {
    const status = this.serviceStatus.get(service.id);
    const isEnabled = this.enabledServices.has(service.id);

    const item = document!.createElement("div");
    item.className = "momento7-service-item";
    if (isEnabled) {
      item.classList.add("momento7-service-item--enabled");
    } else {
      item.classList.add("momento7-service-item--disabled");
    }
    item.draggable = true;
    item.dataset.serviceId = service.id;

    // Toggle checkbox
    const toggle = document!.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "momento7-service-toggle";
    toggle.checked = isEnabled;
    toggle.setAttribute("aria-label", `Enable ${service.name}`);
    toggle.addEventListener("change", (e: Event) => this.handleToggle(service.id, (e.target as HTMLInputElement).checked));

    // Service info
    const info = document!.createElement("div");
    info.className = "momento7-service-info";

    const name = document!.createElement("div");
    name.className = "momento7-service-name";
    name.textContent = service.name;

    info.appendChild(name);

    // Status indicator
    const statusEl = document!.createElement("div");
    statusEl.className = "momento7-service-status";
    if (status?.checked) {
      statusEl.classList.add(status.available ? "momento7-service-status--online" : "momento7-service-status--offline");
      statusEl.innerHTML = status.available ? "✓ Online" : "⚠ Offline";
    } else {
      statusEl.classList.add("momento7-service-status--unknown");
      statusEl.textContent = "? Checking...";
    }

    // Actions
    const actions = document!.createElement("div");
    actions.className = "momento7-service-actions";

    // Drag handle
    const dragHandle = document!.createElement("div");
    dragHandle.className = "momento7-service-drag-handle";
    dragHandle.title = "Drag to reorder";
    dragHandle.innerHTML = "⋮⋮";

    // Test button
    const testBtn = document!.createElement("button");
    testBtn.className = "momento7-btn momento7-btn-small";
    testBtn.textContent = "Test";
    testBtn.setAttribute("aria-label", `Test ${service.name} connection`);
    testBtn.addEventListener("click", () => this.handleTestConnection(service.id));

    actions.appendChild(dragHandle);
    actions.appendChild(testBtn);

    // Assemble item
    item.appendChild(toggle);
    item.appendChild(info);
    item.appendChild(statusEl);
    item.appendChild(actions);

    // Add drag event listeners
    item.addEventListener("dragstart", (e) => this.handleDragStart(e as DragEvent, service.id));
    item.addEventListener("dragover", (e) => this.handleDragOver(e as DragEvent));
    item.addEventListener("drop", (e) => this.handleDrop(e as DragEvent, service.id));
    item.addEventListener("dragend", (e) => this.handleDragEnd(e as DragEvent));

    // Store status element reference for updates
    (item as any).statusElement = statusEl;

    return item;
  }

  private handleToggle(serviceId: string, enabled: boolean): void {
    if (enabled) {
      this.enabledServices.add(serviceId);
    } else {
      this.enabledServices.delete(serviceId);
    }

    // Update UI
    const item = this.services.get(serviceId);
    if (item) {
      if (enabled) {
        item.classList.add("momento7-service-item--enabled");
        item.classList.remove("momento7-service-item--disabled");
      } else {
        item.classList.remove("momento7-service-item--enabled");
        item.classList.add("momento7-service-item--disabled");
      }
    }

    // Fire event
    this.emit("serviceToggle", serviceId, enabled);
  }

  private handleTestConnection(serviceId: string): void {
    this.emit("testConnection", serviceId);
  }

  private handleDragStart(e: DragEvent, serviceId: string): void {
    this.draggedServiceId = serviceId;
    const item = this.services.get(serviceId);
    if (item) {
      item.classList.add("dragging");
      e.dataTransfer!.effectAllowed = "move";
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";

    const items: Element[] = Array.from(this.container?.querySelectorAll(".momento7-service-item") || []);
    const afterElement = this.getDragAfterElement(e.clientY, items);

    const draggingItem = this.services.get(this.draggedServiceId || "");
    if (!draggingItem) return;

    if (afterElement) {
      afterElement.parentNode?.insertBefore(draggingItem, afterElement);
    } else {
      this.container?.querySelector(".momento7-services-list")?.appendChild(draggingItem);
    }
  }

  private handleDrop(e: DragEvent, serviceId: string): void {
    e.preventDefault();
    e.stopPropagation();
  }

  private handleDragEnd(e: DragEvent): void {
    const item = this.services.get(this.draggedServiceId || "");
    if (item) {
      item.classList.remove("dragging");
    }

    // Update service order
    const listContainer = this.container?.querySelector(".momento7-services-list");
    if (listContainer) {
      const items = Array.from(listContainer.querySelectorAll(".momento7-service-item"));
      this.serviceOrder = items
        .map((item) => (item as HTMLElement).dataset.serviceId)
        .filter((id): id is string => !!id);
      this.emit("serviceReorder", this.serviceOrder);
    }

    this.draggedServiceId = null;
  }

  private getDragAfterElement(y: number, items: Element[]): Element | null {
    for (const item of items) {
      const box = item.getBoundingClientRect();
      if (y < box.top + box.height / 2) {
        return item;
      }
    }
    return null;
  }

  setTestLoading(serviceId: string, loading: boolean): void {
    const item = this.services.get(serviceId);
    if (!item) return;

    const statusEl = (item as any).statusElement;
    if (!statusEl) return;

    if (loading) {
      statusEl.className = "momento7-service-status momento7-service-status--testing";
      statusEl.innerHTML = '<span class="momento7-spinner"></span> Testing...';
    }
  }

  setTestResult(serviceId: string, success: boolean, error?: string): void {
    const item = this.services.get(serviceId);
    if (!item) return;

    const statusEl = (item as any).statusElement;
    if (!statusEl) return;

    this.serviceStatus.set(serviceId, {
      available: success,
      checked: true,
      error,
    });

    statusEl.className = "momento7-service-status";
    if (success) {
      statusEl.classList.add("momento7-service-status--online");
      statusEl.innerHTML = "✓ Online";
    } else {
      statusEl.classList.add("momento7-service-status--offline");
      statusEl.innerHTML = `⚠ Offline${error ? `: ${error}` : ""}`;
    }
  }

  getEnabledServices(): string[] {
    return Array.from(this.enabledServices);
  }

  getServiceOrder(): string[] {
    return this.serviceOrder;
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
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
    this.container = document!.createElement("div");
    this.container.className = "momento7-section momento7-credentials-section";
    this.container.innerHTML = `
      <h3>🔐 Credentials</h3>
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
  private timeout: number = 120000;
  private checkBeforeArchive: boolean = true;
  private archiveAgeThreshold: number = 30; // In days
  private autoArchive: boolean = true;
  private timeoutInput: HTMLInputElement | null = null;
  private checkBeforeArchiveCheckbox: HTMLInputElement | null = null;
  private ageThresholdInput: HTMLInputElement | null = null;
  private autoArchiveCheckbox: HTMLInputElement | null = null;

  async render(parent: HTMLElement): Promise<void> {
    this.container = document!.createElement("div");
    this.container.className = "momento7-section momento7-preferences-section";
    this.container.innerHTML = `
      <h3>⚙️ Preferences</h3>
      <p class="momento7-section-description">
        Configure archiving behavior and preferences.
      </p>
      <div class="momento7-preferences-form"></div>
    `;

    parent.appendChild(this.container);

    // Load initial preferences
    this.loadInitialPreferences();

    // Render form controls
    this.renderForm();
  }

  private loadInitialPreferences(): void {
    const manager = PreferencesManager.getInstance();
    this.timeout = manager.getPref("iaTimeout") || 120000;
    this.checkBeforeArchive = manager.getPref("checkBeforeArchive") ?? true;
    this.archiveAgeThreshold = (manager.getPref("archiveAgeThresholdHours") || 720) / 24; // Convert hours to days
    this.autoArchive = manager.getPref("autoArchive") ?? true;
  }

  private renderForm(): void {
    const formContainer = this.container?.querySelector(".momento7-preferences-form") as HTMLElement;
    if (!formContainer) return;

    // Timeout setting
    const timeoutGroup = document!.createElement("div");
    timeoutGroup.className = "momento7-preference-group";

    const timeoutLabel = document!.createElement("label");
    timeoutLabel.className = "momento7-preference-label";
    timeoutLabel.innerHTML = "Request Timeout";

    const timeoutContainer = document!.createElement("div");
    timeoutContainer.className = "momento7-flex-row";

    this.timeoutInput = document!.createElement("input");
    this.timeoutInput.type = "number";
    this.timeoutInput.className = "momento7-preference-input";
    this.timeoutInput.min = "1000";
    this.timeoutInput.max = "600000";
    this.timeoutInput.step = "1000";
    this.timeoutInput.value = String(this.timeout);
    this.timeoutInput.setAttribute("aria-label", "Request timeout in milliseconds");
    this.timeoutInput.addEventListener("change", () => {
      this.timeout = Math.max(1000, Math.min(600000, parseInt(this.timeoutInput!.value, 10)));
      this.timeoutInput!.value = String(this.timeout);
    });

    const timeoutUnit = document!.createElement("span");
    timeoutUnit.textContent = "ms";
    timeoutUnit.style.marginLeft = "8px";
    timeoutUnit.style.alignSelf = "center";

    timeoutContainer.appendChild(this.timeoutInput);
    timeoutContainer.appendChild(timeoutUnit);
    timeoutGroup.appendChild(timeoutLabel);
    timeoutGroup.appendChild(timeoutContainer);

    const timeoutHelp = document!.createElement("p");
    timeoutHelp.className = "momento7-preference-help";
    timeoutHelp.textContent = "Maximum time to wait for archive service responses. Range: 1-600 seconds.";
    timeoutGroup.appendChild(timeoutHelp);

    formContainer.appendChild(timeoutGroup);

    // Check before archive setting
    const checkGroup = document!.createElement("div");
    checkGroup.className = "momento7-preference-group";

    this.checkBeforeArchiveCheckbox = document!.createElement("input");
    this.checkBeforeArchiveCheckbox.type = "checkbox";
    this.checkBeforeArchiveCheckbox.className = "momento7-preference-checkbox";
    this.checkBeforeArchiveCheckbox.checked = this.checkBeforeArchive;
    this.checkBeforeArchiveCheckbox.setAttribute("aria-label", "Check for existing archives before archiving");
    this.checkBeforeArchiveCheckbox.addEventListener("change", () => {
      this.checkBeforeArchive = this.checkBeforeArchiveCheckbox!.checked;
    });

    const checkLabel = document!.createElement("label");
    checkLabel.className = "momento7-preference-label";
    checkLabel.appendChild(this.checkBeforeArchiveCheckbox);
    checkLabel.appendChild(document!.createTextNode("Check for existing archives before archiving"));

    checkGroup.appendChild(checkLabel);

    const checkHelp = document!.createElement("p");
    checkHelp.className = "momento7-preference-help";
    checkHelp.textContent = "Query archive services for existing mementos of the URL before archiving.";
    checkGroup.appendChild(checkHelp);

    formContainer.appendChild(checkGroup);

    // Age threshold setting (only show if check before archive is enabled)
    const ageGroup = document!.createElement("div");
    ageGroup.className = "momento7-preference-group";
    if (!this.checkBeforeArchive) {
      ageGroup.style.display = "none";
    }

    const ageLabel = document!.createElement("label");
    ageLabel.className = "momento7-preference-label";
    ageLabel.textContent = "Archive age threshold";

    const ageContainer = document!.createElement("div");
    ageContainer.className = "momento7-flex-row";

    this.ageThresholdInput = document!.createElement("input");
    this.ageThresholdInput.type = "number";
    this.ageThresholdInput.className = "momento7-preference-input";
    this.ageThresholdInput.min = "1";
    this.ageThresholdInput.max = "3650";
    this.ageThresholdInput.value = String(this.archiveAgeThreshold);
    this.ageThresholdInput.setAttribute("aria-label", "Minimum age of archive in days");
    this.ageThresholdInput.addEventListener("change", () => {
      this.archiveAgeThreshold = Math.max(1, parseInt(this.ageThresholdInput!.value, 10));
      this.ageThresholdInput!.value = String(this.archiveAgeThreshold);
    });

    const ageUnit = document!.createElement("span");
    ageUnit.textContent = "days";
    ageUnit.style.marginLeft = "8px";
    ageUnit.style.alignSelf = "center";

    ageContainer.appendChild(this.ageThresholdInput);
    ageContainer.appendChild(ageUnit);
    ageGroup.appendChild(ageLabel);
    ageGroup.appendChild(ageContainer);

    const ageHelp = document!.createElement("p");
    ageHelp.className = "momento7-preference-help";
    ageHelp.textContent = "Only archive if existing memento is older than this threshold. Skip archiving if recent enough.";
    ageGroup.appendChild(ageHelp);

    formContainer.appendChild(ageGroup);

    // Toggle visibility of age group when check before archive changes
    this.checkBeforeArchiveCheckbox.addEventListener("change", () => {
      ageGroup.style.display = this.checkBeforeArchive ? "flex" : "none";
    });

    // Auto-archive setting
    const autoGroup = document!.createElement("div");
    autoGroup.className = "momento7-preference-group";

    this.autoArchiveCheckbox = document!.createElement("input");
    this.autoArchiveCheckbox.type = "checkbox";
    this.autoArchiveCheckbox.className = "momento7-preference-checkbox";
    this.autoArchiveCheckbox.checked = this.autoArchive;
    this.autoArchiveCheckbox.setAttribute("aria-label", "Automatically archive new items");
    this.autoArchiveCheckbox.addEventListener("change", () => {
      this.autoArchive = this.autoArchiveCheckbox!.checked;
    });

    const autoLabel = document!.createElement("label");
    autoLabel.className = "momento7-preference-label";
    autoLabel.appendChild(this.autoArchiveCheckbox);
    autoLabel.appendChild(document!.createTextNode("Automatically archive new items"));

    autoGroup.appendChild(autoLabel);

    const autoHelp = document!.createElement("p");
    autoHelp.className = "momento7-preference-help";
    autoHelp.textContent = "When enabled, new items added to Zotero will be automatically archived.";
    autoGroup.appendChild(autoHelp);

    formContainer.appendChild(autoGroup);

    // Reset button
    const resetBtn = document!.createElement("button");
    resetBtn.className = "momento7-btn momento7-btn-secondary";
    resetBtn.textContent = "Reset to Defaults";
    resetBtn.setAttribute("aria-label", "Reset all preferences to default values");
    resetBtn.addEventListener("click", () => this.resetToDefaults());

    const resetGroup = document!.createElement("div");
    resetGroup.style.marginTop = "16px";
    resetGroup.appendChild(resetBtn);

    formContainer.appendChild(resetGroup);
  }

  private resetToDefaults(): void {
    this.timeout = 120000;
    this.checkBeforeArchive = true;
    this.archiveAgeThreshold = 30;
    this.autoArchive = true;

    // Update UI
    if (this.timeoutInput) this.timeoutInput.value = String(this.timeout);
    if (this.checkBeforeArchiveCheckbox) this.checkBeforeArchiveCheckbox.checked = this.checkBeforeArchive;
    if (this.ageThresholdInput) this.ageThresholdInput.value = String(this.archiveAgeThreshold);
    if (this.autoArchiveCheckbox) this.autoArchiveCheckbox.checked = this.autoArchive;
  }

  getTimeout(): number {
    return this.timeout;
  }

  getCheckBeforeArchive(): boolean {
    return this.checkBeforeArchive;
  }

  getArchiveAgeThreshold(): number {
    // Convert days to hours for preference storage
    return this.archiveAgeThreshold * 24;
  }

  getAutoArchive(): boolean {
    return this.autoArchive;
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }
}
