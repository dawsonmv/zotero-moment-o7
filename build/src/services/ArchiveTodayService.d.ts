import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
export declare class ArchiveTodayService extends BaseArchiveService {
    private static readonly WORKER_URL;
    private workerAvailable;
    constructor();
    isAvailable(): Promise<boolean>;
    protected archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult>;
    private archiveViaWorker;
    private archiveDirectly;
    private extractArchivedUrl;
    checkAvailability(url: string): Promise<{
        available: boolean;
        existingUrl?: string;
    }>;
}
//# sourceMappingURL=ArchiveTodayService.d.ts.map