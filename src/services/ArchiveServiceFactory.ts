/**
 * Factory for creating archive services
 * Implements the Factory pattern for service instantiation
 */

import { ArchiveService } from './types';
import { InternetArchiveService } from './InternetArchiveService';
import { ArchiveTodayService } from './ArchiveTodayService';
import { PermaCCService } from './PermaCCService';
import { UKWebArchiveService } from './UKWebArchiveService';
import { ArquivoPtService } from './ArquivoPtService';

export type ServiceType = 
  | 'internetarchive' 
  | 'archivetoday' 
  | 'permacc' 
  | 'ukwebarchive' 
  | 'arquivopt';

/**
 * Service configuration for factory
 */
export interface ServiceConfiguration {
  type: ServiceType;
  enabled: boolean;
  config?: Record<string, any>;
}

/**
 * Factory for creating archive services
 * Centralizes service creation logic and configuration
 */
export class ArchiveServiceFactory {
  private static serviceConstructors = new Map<ServiceType, new() => ArchiveService>([
    ['internetarchive', InternetArchiveService],
    ['archivetoday', ArchiveTodayService],
    ['permacc', PermaCCService],
    ['ukwebarchive', UKWebArchiveService],
    ['arquivopt', ArquivoPtService]
  ]);

  private static instances = new Map<ServiceType, ArchiveService>();

  /**
   * Create or get a service instance
   * Uses singleton pattern for service instances
   */
  static create(type: ServiceType): ArchiveService {
    // Return existing instance if available
    if (this.instances.has(type)) {
      return this.instances.get(type)!;
    }

    const ServiceConstructor = this.serviceConstructors.get(type);
    if (!ServiceConstructor) {
      throw new Error(`Unknown service type: ${type}`);
    }

    const instance = new ServiceConstructor();
    this.instances.set(type, instance);
    return instance;
  }

  /**
   * Create multiple services from configuration
   */
  static createFromConfig(configs: ServiceConfiguration[]): Map<string, ArchiveService> {
    const services = new Map<string, ArchiveService>();

    for (const config of configs) {
      if (!config.enabled) continue;

      try {
        const service = this.create(config.type);
        services.set(service.id, service);
      } catch (error) {
        console.error(`Failed to create service ${config.type}:`, error);
      }
    }

    return services;
  }

  /**
   * Get all available service types
   */
  static getAvailableTypes(): ServiceType[] {
    return Array.from(this.serviceConstructors.keys());
  }

  /**
   * Check if a service type is registered
   */
  static isRegistered(type: string): type is ServiceType {
    return this.serviceConstructors.has(type as ServiceType);
  }

  /**
   * Register a new service type
   * Allows extending the factory with custom services
   */
  static register(type: ServiceType, constructor: new() => ArchiveService): void {
    this.serviceConstructors.set(type, constructor);
  }

  /**
   * Clear all cached instances
   * Useful for testing or resetting state
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Get service metadata
   */
  static getServiceMetadata(type: ServiceType): {
    name: string;
    requiresAuth: boolean;
    capabilities: Record<string, boolean>;
  } | null {
    try {
      const service = this.create(type);
      return {
        name: service.name,
        requiresAuth: (service as any).config?.capabilities?.requiresAuthentication || false,
        capabilities: (service as any).config?.capabilities || {}
      };
    } catch {
      return null;
    }
  }
}

/**
 * Service discovery helper
 * Finds appropriate services based on URL characteristics
 */
export class ServiceDiscovery {
  private static urlPatterns = new Map<RegExp, ServiceType[]>([
    // UK domains prefer UK Web Archive
    [/\.uk$/i, ['ukwebarchive', 'internetarchive', 'archivetoday']],
    
    // Portuguese domains prefer Arquivo.pt
    [/\.pt$/i, ['arquivopt', 'internetarchive', 'archivetoday']],
    
    // Academic domains might prefer Perma.cc
    [/\.(edu|ac\.[a-z]+)$/i, ['permacc', 'internetarchive', 'archivetoday']],
    
    // Default fallback order
    [/.+/, ['internetarchive', 'archivetoday']]
  ]);

  /**
   * Discover best services for a given URL
   */
  static discoverServices(url: string): ServiceType[] {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      for (const [pattern, services] of this.urlPatterns) {
        if (pattern.test(domain)) {
          return services;
        }
      }
    } catch {
      // Invalid URL, return defaults
    }

    return ['internetarchive', 'archivetoday'];
  }

  /**
   * Get optimal service order based on URL and availability
   */
  static async getOptimalServiceOrder(
    url: string, 
    availableServices: Set<string>
  ): Promise<ServiceType[]> {
    const discovered = this.discoverServices(url);
    
    // Filter to only available services
    const available = discovered.filter(type => 
      availableServices.has(type)
    );

    // Add any available services not in discovered list
    const remaining = Array.from(availableServices)
      .filter(service => !available.includes(service as ServiceType))
      .filter(service => ArchiveServiceFactory.isRegistered(service));

    return [...available, ...remaining] as ServiceType[];
  }
}