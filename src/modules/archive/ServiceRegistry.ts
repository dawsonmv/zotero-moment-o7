/**
 * Service Registry for managing archive services
 */

import { ArchiveService, ServiceRegistryEntry } from "./types";

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ArchiveService> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  init(): void {
    if (this.initialized) {
      return;
    }

    this.services.clear();
    this.initialized = true;

    Zotero.debug("MomentO7: Service Registry initialized");
  }

  register(id: string, service: ArchiveService): void {
    if (!this.initialized) {
      throw new Error("Service Registry not initialized");
    }

    if (this.services.has(id)) {
      Zotero.debug(`MomentO7: Service ${id} already registered, replacing`);
    }

    this.services.set(id, service);
    Zotero.debug(`MomentO7: Registered service: ${id}`);
  }

  unregister(id: string): boolean {
    return this.services.delete(id);
  }

  get(id: string): ArchiveService | undefined {
    return this.services.get(id);
  }

  getAll(): ServiceRegistryEntry[] {
    return Array.from(this.services.entries()).map(([id, service]) => ({
      id,
      service,
    }));
  }

  async getAvailable(): Promise<ServiceRegistryEntry[]> {
    const available: ServiceRegistryEntry[] = [];

    for (const [id, service] of this.services.entries()) {
      try {
        if (await service.isAvailable()) {
          available.push({ id, service });
        }
      } catch (error) {
        Zotero.debug(
          `MomentO7: Service ${id} availability check failed: ${error}`,
        );
      }
    }

    return available;
  }

  clear(): void {
    this.services.clear();
    this.initialized = false;
  }
}
