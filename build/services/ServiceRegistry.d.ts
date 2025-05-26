/**
 * Service Registry for managing archive services
 */
import { ArchiveService, ServiceRegistryEntry } from './types';
export declare class ServiceRegistry {
    private static instance;
    private services;
    private initialized;
    private constructor();
    static getInstance(): ServiceRegistry;
    init(): void;
    register(id: string, service: ArchiveService): void;
    unregister(id: string): boolean;
    get(id: string): ArchiveService | undefined;
    getAll(): ServiceRegistryEntry[];
    getAvailable(): Promise<ServiceRegistryEntry[]>;
    clear(): void;
}
//# sourceMappingURL=ServiceRegistry.d.ts.map