/**
 * Coordinates archiving across multiple services
 */

import { ServiceRegistry } from './ServiceRegistry';
import { ArchiveResult, ArchiveService, Preferences } from './types';

export class ArchiveCoordinator {
  private static instance: ArchiveCoordinator;
  private registry: ServiceRegistry;

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
   * Archive items with a specific service or using fallback logic
   */
  async archiveItems(
    items: Zotero.Item[], 
    serviceId?: string
  ): Promise<ArchiveResult[]> {
    if (!items || items.length === 0) {
      throw new Error('No items provided for archiving');
    }

    const results: ArchiveResult[] = [];

    for (const item of items) {
      try {
        const result = await this.archiveItem(item, serviceId);
        results.push(result);
      } catch (error) {
        Zotero.debug(`MomentO7: Error archiving item ${item.id}: ${error}`);
        results.push({
          item,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Archive a single item
   */
  private async archiveItem(
    item: Zotero.Item,
    serviceId?: string
  ): Promise<ArchiveResult> {
    const url = item.getField('url');
    if (!url) {
      throw new Error('Item has no URL to archive');
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
   * Archive with a specific service
   */
  private async archiveWithService(
    item: Zotero.Item,
    service: ArchiveService,
    serviceId: string
  ): Promise<ArchiveResult> {
    try {
      const results = await service.archive([item]);
      return results[0] || {
        item,
        success: false,
        service: serviceId,
        error: 'No result returned from service'
      };
    } catch (error) {
      return {
        item,
        success: false,
        service: serviceId,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Archive using fallback order from preferences
   */
  private async archiveWithFallback(item: Zotero.Item): Promise<ArchiveResult> {
    const availableServices = await this.registry.getAvailable();
    
    if (availableServices.length === 0) {
      throw new Error('No archiving services available');
    }

    // Get fallback order from preferences
    const fallbackOrder = this.getFallbackOrder();
    
    // Sort available services according to fallback order
    const orderedServices = this.orderServices(availableServices, fallbackOrder);

    const errors: string[] = [];
    
    for (const { id, service } of orderedServices) {
      try {
        const result = await this.archiveWithService(item, service, id);
        if (result.success) {
          return result;
        }
        errors.push(`${id}: ${result.error}`);
      } catch (error) {
        errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    throw new Error(`All archive services failed:\n${errors.join('\n')}`);
  }

  /**
   * Auto-archive an item using the default service
   */
  async autoArchive(item: Zotero.Item): Promise<ArchiveResult | null> {
    const url = item.getField('url');
    if (!url || !this.shouldAutoArchive(url)) {
      return null;
    }

    // Use default service from preferences
    const defaultService = Zotero.Prefs.get('extensions.momento7.defaultService', 'internetarchive');
    
    try {
      return await this.archiveItem(item, defaultService);
    } catch (error) {
      Zotero.debug(`MomentO7: Auto-archive failed for item ${item.id}: ${error}`);
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
      /172\.(1[6-9]|2[0-9]|3[0-1])\./
    ];

    return !excludePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Get fallback order from preferences
   */
  private getFallbackOrder(): string[] {
    const order = Zotero.Prefs.get(
      'extensions.momento7.fallbackOrder',
      'internetarchive,archivetoday,arquivopt,permacc,ukwebarchive'
    );
    return order.split(',').filter(id => id.trim());
  }

  /**
   * Order services according to fallback preferences
   */
  private orderServices(
    services: Array<{ id: string; service: ArchiveService }>,
    fallbackOrder: string[]
  ): Array<{ id: string; service: ArchiveService }> {
    const ordered: Array<{ id: string; service: ArchiveService }> = [];
    const remaining = new Map(services.map(s => [s.id, s]));

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