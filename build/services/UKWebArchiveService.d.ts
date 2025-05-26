import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult, ArchiveProgress } from './types';
export declare class UKWebArchiveService extends BaseArchiveService {
    private static readonly API_BASE;
    private static readonly NOMINATION_URL;
    constructor();
    archive(url: string, progress?: ArchiveProgress): Promise<ArchiveResult>;
    private isUKDomain;
    private buildNominationForm;
    private findExistingArchive;
    checkAvailability(url: string): Promise<{
        available: boolean;
        existingUrl?: string;
    }>;
}
//# sourceMappingURL=UKWebArchiveService.d.ts.map