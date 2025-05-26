import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult, ArchiveProgress } from './types';
export declare class ArquivoPtService extends BaseArchiveService {
    private static readonly API_BASE;
    private static readonly SAVE_URL;
    constructor();
    archive(url: string, progress?: ArchiveProgress): Promise<ArchiveResult>;
    private extractArchivedUrl;
    private escapeRegExp;
    private findExistingArchive;
    checkAvailability(url: string): Promise<{
        available: boolean;
        existingUrl?: string;
    }>;
}
//# sourceMappingURL=ArquivoPtService.d.ts.map