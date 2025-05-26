/**
 * Internet Archive service implementation
 */
import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
export declare class InternetArchiveService extends BaseArchiveService {
    private timeout;
    private maxRetries;
    private retryDelay;
    constructor();
    isAvailable(): Promise<boolean>;
    protected archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult>;
    private extractArchivedUrl;
    private delay;
    private reloadSettings;
}
//# sourceMappingURL=InternetArchiveService.d.ts.map