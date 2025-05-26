/**
 * Factory for creating archive services
 * Implements the Factory pattern for service instantiation
 */
import { ArchiveService } from './types';
export type ServiceType = 'internetarchive' | 'archivetoday' | 'permacc' | 'ukwebarchive' | 'arquivopt';
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
export declare class ArchiveServiceFactory {
    private static serviceConstructors;
    private static instances;
    /**
     * Create or get a service instance
     * Uses singleton pattern for service instances
     */
    static create(type: ServiceType): ArchiveService;
    /**
     * Create multiple services from configuration
     */
    static createFromConfig(configs: ServiceConfiguration[]): Map<string, ArchiveService>;
    /**
     * Get all available service types
     */
    static getAvailableTypes(): ServiceType[];
    /**
     * Check if a service type is registered
     */
    static isRegistered(type: string): type is ServiceType;
    /**
     * Register a new service type
     * Allows extending the factory with custom services
     */
    static register(type: ServiceType, constructor: new () => ArchiveService): void;
    /**
     * Clear all cached instances
     * Useful for testing or resetting state
     */
    static clearInstances(): void;
    /**
     * Get service metadata
     */
    static getServiceMetadata(type: ServiceType): {
        name: string;
        requiresAuth: boolean;
        capabilities: Record<string, boolean>;
    } | null;
}
/**
 * Service discovery helper
 * Finds appropriate services based on URL characteristics
 */
export declare class ServiceDiscovery {
    private static urlPatterns;
    /**
     * Discover best services for a given URL
     */
    static discoverServices(url: string): ServiceType[];
    /**
     * Get optimal service order based on URL and availability
     */
    static getOptimalServiceOrder(url: string, availableServices: Set<string>): Promise<ServiceType[]>;
}
//# sourceMappingURL=ArchiveServiceFactory.d.ts.map