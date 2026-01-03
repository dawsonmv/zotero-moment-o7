/**
 * Coordinates archiving across multiple services
 * Integrates MementoChecker to prevent duplicate archiving
 * Uses ConcurrentArchiveQueue for parallel processing (max 4 concurrent items)
 */

import { ServiceRegistry } from "./ServiceRegistry";
import { ArchiveResult, ArchiveService } from "./types";
import { MementoChecker, MementoInfo } from "../memento/MementoChecker";
import { PreferencesManager } from "../preferences/PreferencesManager";
import { ConcurrentArchiveQueue } from "../../utils/ConcurrentArchiveQueue";
import { TrafficMonitor } from "../../utils/TrafficMonitor";
import {
  CircuitBreakerManager,
  CircuitState,
} from "../../utils/CircuitBreaker";

export class ArchiveCoordinator {
  private static instance: ArchiveCoordinator;
  private registry: ServiceRegistry;
  private currentTrafficMonitor: TrafficMonitor | null = null;
  private requestedServiceId: string | undefined;

  private constructor() {
    this.registry = ServiceRegistry.getInstance();
  }

  static getInstance(): ArchiveCoordinator {
    if (!ArchiveCoordinator.instance) {
      ArchiveCoordinator.instance = new ArchiveCoordinator();
    }
    return ArchiveCoordinator.instance;
  }

  /**
   * Archive items using concurrent queue (max 4 items simultaneously)
   * In test environment, falls back to sequential processing to avoid memory issues
   */
  async archiveItems(
    items: Zotero.Item[],
    serviceId?: string,
  ): Promise<ArchiveResult[]> {
    if (!items || items.length === 0) {
      throw new Error("No items provided for archiving");
    }

    // Set up context for this archiving batch
    this.requestedServiceId = serviceId;
    this.currentTrafficMonitor = TrafficMonitor.getInstance();

    try {
      // Use concurrent queue if not in test environment
      if (process.env.NODE_ENV === "test") {
        // Sequential processing for tests to avoid memory accumulation
        const results: ArchiveResult[] = [];
        for (const item of items) {
          results.push(await this.archiveItemWithContext(item));
        }
        return results;
      }

      // Concurrent processing for production
      const queue = new ConcurrentArchiveQueue(4);
      return await queue.process(items, (item) =>
        this.archiveItemWithContext(item),
      );
    } finally {
      // Clean up context
      this.currentTrafficMonitor = null;
      this.requestedServiceId = undefined;
    }
  }

  /**
   * Archive a single item within batch context
   * Wraps archiveItem to integrate with concurrent queue and traffic monitoring
   */
  private async archiveItemWithContext(
    item: Zotero.Item,
  ): Promise<ArchiveResult> {
    try {
      return await this.archiveItem(item, this.requestedServiceId);
    } catch (error) {
      Zotero.debug(`MomentO7: Error archiving item ${item.id}: ${error}`);
      return {
        item,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Archive a single item
   * Checks for existing mementos before archiving if preference enabled
   */
  private async archiveItem(
    item: Zotero.Item,
    serviceId?: string,
  ): Promise<ArchiveResult> {
    const urlField = item.getField("url");
    const url = typeof urlField === "string" ? urlField : "";
    if (!url) {
      throw new Error("Item has no URL to archive");
    }

    // Check for existing mementos if preference enabled
    if (PreferencesManager.shouldCheckBeforeArchive()) {
      const existingResult = await this.checkExistingMemento(url, item);
      if (existingResult) {
        return existingResult;
      }
    }

    // If specific service requested, use it
    if (serviceId) {
      const service = this.registry.get(serviceId);
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }
      return await this.archiveWithService(item, service, serviceId);
    }

    // Otherwise use fallback logic
    return await this.archiveWithFallback(item);
  }

  /**
   * Check for existing mementos before archiving
   * Returns ArchiveResult if recent memento found and should skip, null otherwise
   */
  private async checkExistingMemento(
    url: string,
    item: Zotero.Item,
  ): Promise<ArchiveResult | null> {
    try {
      Zotero.debug(`MomentO7: Checking for existing mementos of ${url}`);

      // First check item's stored mementos
      const storedMementos = MementoChecker.findExistingMementos(item);
      if (storedMementos.length > 0) {
        const recentMemento = this.findRecentMemento(storedMementos);
        if (recentMemento) {
          Zotero.debug(
            `MomentO7: Found recent stored memento from ${recentMemento.service}`,
          );
          return this.createExistingMementoResult(
            item,
            recentMemento,
            "stored",
          );
        }
      }

      // Check remote archives via Memento Protocol
      const mementoResult = await MementoChecker.checkUrl(url);
      if (mementoResult.hasMemento && mementoResult.mementos.length > 0) {
        const recentMemento = this.findRecentMemento(mementoResult.mementos);
        if (recentMemento) {
          Zotero.debug(
            `MomentO7: Found recent remote memento from ${recentMemento.service}`,
          );

          // If auto-skip enabled, return existing memento
          if (PreferencesManager.shouldSkipExistingMementos()) {
            return this.createExistingMementoResult(
              item,
              recentMemento,
              "remote",
            );
          }

          // Otherwise return with existingArchive info for UI to handle
          return {
            item,
            success: true,
            archivedUrl: recentMemento.url,
            service: recentMemento.service,
            message: `Recent archive found (${this.formatAge(recentMemento.datetime)})`,
            existingArchive: {
              memento: recentMemento,
              source: "remote",
              checkResult: mementoResult,
            },
          };
        }
      }

      return null; // No recent memento found, proceed with archiving
    } catch (error) {
      // Log error but don't block archiving
      Zotero.debug(`MomentO7: Memento check failed: ${error}`);
      return null;
    }
  }

  /**
   * Find a memento within the age threshold
   */
  private findRecentMemento(mementos: MementoInfo[]): MementoInfo | null {
    const thresholdMs = PreferencesManager.getArchiveAgeThresholdMs();
    const now = Date.now();

    // Sort by datetime descending (most recent first)
    const sorted = [...mementos].sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
    );

    for (const memento of sorted) {
      const mementoAge = now - new Date(memento.datetime).getTime();
      if (mementoAge < thresholdMs) {
        return memento;
      }
    }

    return null;
  }

  /**
   * Create ArchiveResult for existing memento
   */
  private createExistingMementoResult(
    item: Zotero.Item,
    memento: MementoInfo,
    source: "stored" | "remote",
  ): ArchiveResult {
    return {
      item,
      success: true,
      archivedUrl: memento.url,
      service: memento.service,
      message: `Using existing archive from ${memento.service} (${this.formatAge(memento.datetime)})`,
      existingArchive: {
        memento,
        source,
        skipped: true,
      },
    };
  }

  /**
   * Format memento age for display
   */
  private formatAge(datetime: string): string {
    const ageMs = Date.now() - new Date(datetime).getTime();
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} old`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} old`;
    }
    return "less than 1 hour old";
  }

  /**
   * Archive with a specific service
   */
  private async archiveWithService(
    item: Zotero.Item,
    service: ArchiveService,
    serviceId: string,
  ): Promise<ArchiveResult> {
    try {
      const results = await service.archive([item]);
      return (
        results[0] || {
          item,
          success: false,
          service: serviceId,
          error: "No result returned from service",
        }
      );
    } catch (error) {
      return {
        item,
        success: false,
        service: serviceId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Archive using fallback order from preferences
   * Filters out jammed services based on traffic monitoring
   */
  private async archiveWithFallback(item: Zotero.Item): Promise<ArchiveResult> {
    const availableServices = await this.registry.getAvailable();

    if (availableServices.length === 0) {
      throw new Error("No archiving services available");
    }

    // Get fallback order from preferences
    const fallbackOrder = this.getFallbackOrder();

    // Sort available services according to fallback order
    let orderedServices = this.orderServices(availableServices, fallbackOrder);

    // Filter out jammed services from traffic monitoring
    if (this.currentTrafficMonitor) {
      orderedServices = orderedServices.filter(
        ({ id }) => !this.currentTrafficMonitor!.isServiceJammed(id),
      );

      if (orderedServices.length === 0) {
        throw new Error(
          "No non-jammed archiving services available - consider retrying later",
        );
      }

      Zotero.debug(
        `MomentO7: Filtering jammed services, ${orderedServices.length} services available for fallback`,
      );
    }

    // Filter out services with OPEN circuit breakers
    const breakerManager = CircuitBreakerManager.getInstance();
    const beforeCircuitFilter = orderedServices.length;
    orderedServices = orderedServices.filter(({ id }) => {
      const state = breakerManager.getBreaker(id).getState();
      return state.state !== CircuitState.OPEN;
    });

    if (orderedServices.length < beforeCircuitFilter) {
      Zotero.debug(
        `MomentO7: Filtering services with OPEN circuit breakers, ${orderedServices.length}/${beforeCircuitFilter} services available for fallback`,
      );
    }

    if (orderedServices.length === 0) {
      throw new Error(
        "No archiving services available (all circuit breakers OPEN) - consider retrying later",
      );
    }

    const errors: string[] = [];

    for (const { id, service } of orderedServices) {
      try {
        const result = await this.archiveWithService(item, service, id);
        if (result.success) {
          return result;
        }
        errors.push(`${id}: ${result.error}`);
      } catch (error) {
        errors.push(
          `${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    throw new Error(`All archive services failed:\n${errors.join("\n")}`);
  }

  /**
   * Auto-archive an item using the default service
   */
  async autoArchive(item: Zotero.Item): Promise<ArchiveResult | null> {
    const urlField = item.getField("url");
    const url = typeof urlField === "string" ? urlField : "";
    if (!url || !this.shouldAutoArchive(url)) {
      return null;
    }

    // Use default service from preferences
    const defaultService =
      (Zotero.Prefs.get("extensions.momento7.defaultService") as string) ||
      "internetarchive";

    try {
      return await this.archiveItem(item, defaultService);
    } catch (error) {
      Zotero.debug(
        `MomentO7: Auto-archive failed for item ${item.id}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Check if URL should be auto-archived
   */
  private shouldAutoArchive(url: string): boolean {
    const excludePatterns = [
      /^file:/i,
      /^chrome:/i,
      /^about:/i,
      /^data:/i,
      /localhost/i,
      /127\.0\.0\.1/,
      /192\.168\./,
      /10\.\d+\.\d+\.\d+/,
      /172\.(1[6-9]|2[0-9]|3[0-1])\./,
    ];

    return !excludePatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Get fallback order from preferences
   */
  private getFallbackOrder(): string[] {
    const order =
      (Zotero.Prefs.get("extensions.momento7.fallbackOrder") as string) ||
      "internetarchive,archivetoday,arquivopt,permacc,ukwebarchive";
    return order.split(",").filter((id: string) => id.trim());
  }

  /**
   * Order services according to fallback preferences
   */
  private orderServices(
    services: Array<{ id: string; service: ArchiveService }>,
    fallbackOrder: string[],
  ): Array<{ id: string; service: ArchiveService }> {
    const ordered: Array<{ id: string; service: ArchiveService }> = [];
    const remaining = new Map(services.map((s) => [s.id, s]));

    // Add services in fallback order
    for (const serviceId of fallbackOrder) {
      const service = remaining.get(serviceId);
      if (service) {
        ordered.push(service);
        remaining.delete(serviceId);
      }
    }

    // Add any remaining services
    ordered.push(...remaining.values());

    return ordered;
  }
}
