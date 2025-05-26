import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
export declare class PermaCCService extends BaseArchiveService {
    private static readonly API_BASE;
    private apiKey;
    private defaultFolder;
    constructor();
    isAvailable(): Promise<boolean>;
    private loadCredentials;
    protected archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult>;
    private parsePermaCCError;
    checkAvailability(_url: string): Promise<{
        available: boolean;
        existingUrl?: string;
    }>;
    getFolders(): Promise<Array<{
        id: string;
        name: string;
    }>>;
    validateApiKey(apiKey: string): Promise<boolean>;
}
//# sourceMappingURL=PermaCCService.d.ts.map