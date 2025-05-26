/**
 * Internet Archive service implementation
 */
import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult } from './types';
export declare class InternetArchiveService extends BaseArchiveService {
    private timeout;
    private maxRetries;
    private retryDelay;
    constructor();
    isAvailable(): Promise<boolean>;
    archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;
    private archiveItem;
    private extractArchivedUrl;
    private isArchived;
    private delay;
    private reloadSettings;
}
//# sourceMappingURL=InternetArchiveService.d.ts.map