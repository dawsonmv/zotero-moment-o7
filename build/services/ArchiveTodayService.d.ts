import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult, ArchiveProgress } from './types';
export declare class ArchiveTodayService extends BaseArchiveService {
    private static readonly WORKER_URL;
    private workerAvailable;
    constructor();
    archive(url: string, progress?: ArchiveProgress): Promise<ArchiveResult>;
    private archiveViaWorker;
    private archiveDirectly;
    private extractArchivedUrl;
    checkAvailability(url: string): Promise<{
        available: boolean;
        existingUrl?: string;
    }>;
}
//# sourceMappingURL=ArchiveTodayService.d.ts.map