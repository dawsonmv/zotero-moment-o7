import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
export declare class ArquivoPtService extends BaseArchiveService {
    private static readonly API_BASE;
    private static readonly SAVE_URL;
    constructor();
    isAvailable(): Promise<boolean>;
    protected archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult>;
    private extractArchivedUrl;
    private escapeRegExp;
    private findExistingArchive;
    checkAvailability(url: string): Promise<{
        available: boolean;
        existingUrl?: string;
    }>;
}
//# sourceMappingURL=ArquivoPtService.d.ts.map