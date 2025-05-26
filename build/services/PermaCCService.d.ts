import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult, ArchiveProgress } from './types';
export declare class PermaCCService extends BaseArchiveService {
    private static readonly API_BASE;
    private apiKey;
    private defaultFolder;
    constructor();
    private loadCredentials;
    archive(url: string, progress?: ArchiveProgress): Promise<ArchiveResult>;
    private parsePermaCCError;
    checkAvailability(url: string): Promise<{
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