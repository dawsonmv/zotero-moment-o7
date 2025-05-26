import { BaseArchiveService } from './BaseArchiveService';
import { SingleArchiveResult, ArchiveProgress } from './types';
import { PreferencesManager } from '../preferences/PreferencesManager';

export class ArchiveTodayService extends BaseArchiveService {
  private static readonly WORKER_URL = 'https://archive-proxy.dawsonvaldes.workers.dev/';
  private workerAvailable: boolean = true;
  
  constructor() {
    super({
      id: 'archivetoday',
      name: 'Archive.today',
      homepage: 'https://archive.today',
      capabilities: {
        acceptsUrl: true,
        returnsUrl: true,
        preservesJavaScript: true,
        preservesInteractiveElements: true
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    return true; // Archive.today is generally available
  }

  protected async archiveUrl(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult> {
    // const startTime = Date.now();
    
    try {
      // Try Worker first
      if (this.workerAvailable) {
        try {
          const result = await this.archiveViaWorker(url, progress);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.warn('Archive.today Worker failed, falling back to direct method:', error);
          this.workerAvailable = false;
        }
      }

      // Fallback to direct submission
      return await this.archiveDirectly(url, progress);
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      } as SingleArchiveResult;
    }
  }

  private async archiveViaWorker(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult> {
    progress?.onStatusUpdate(`Submitting ${url} to Archive.today via proxy...`);
    
    const timeout = PreferencesManager.getTimeout('archivetoday');
    const response = await this.makeHttpRequest(
      ArchiveTodayService.WORKER_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        timeout
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Worker request failed');
    }

    const data = JSON.parse(response.data);
    
    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.archivedUrl) {
      throw new Error('No archived URL returned from worker');
    }

    return {
      success: true,
      url: data.archivedUrl,
      metadata: {
        originalUrl: url,
        archiveDate: new Date().toISOString(),
        service: this.config.name
      }
    };
  }

  private async archiveDirectly(url: string, progress?: ArchiveProgress): Promise<SingleArchiveResult> {
    progress?.onStatusUpdate(`Submitting ${url} directly to Archive.today...`);
    
    const timeout = PreferencesManager.getTimeout('archivetoday');
    
    // Submit to Archive.today
    const submitResponse = await this.makeHttpRequest(
      'https://archive.today/submit/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `url=${encodeURIComponent(url)}`,
        timeout
      }
    );

    if (!submitResponse.success) {
      throw new Error(submitResponse.error || 'Direct submission failed');
    }

    // Extract the archived URL from response
    const archivedUrl = this.extractArchivedUrl(submitResponse.data);
    
    if (!archivedUrl) {
      throw new Error('Could not extract archived URL from response');
    }

    return {
      success: true,
      url: archivedUrl,
      metadata: {
        originalUrl: url,
        archiveDate: new Date().toISOString(),
        service: this.config.name
      }
    };
  }

  private extractArchivedUrl(html: string): string | null {
    // Look for the archived URL in various patterns
    const patterns = [
      /https?:\/\/archive\.(today|is|ph|md|li)\/[A-Za-z0-9]+/,
      /<input[^>]+id="SHARE_LONGLINK"[^>]+value="([^"]+)"/,
      /<a[^>]+href="(https?:\/\/archive\.[^"]+)"[^>]*>.*?View\s+snapshot/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  async checkAvailability(url: string): Promise<{ available: boolean; existingUrl?: string }> {
    try {
      // Check if URL is already archived
      const checkUrl = `https://archive.today/${encodeURIComponent(url)}`;
      const response = await this.makeHttpRequest(checkUrl, {
        method: 'GET',
        timeout: 30000
      });

      if (response.success && response.status === 200) {
        // URL is already archived
        const archivedUrl = this.extractArchivedUrl(response.data);
        if (archivedUrl) {
          return { available: true, existingUrl: archivedUrl };
        }
      }

      return { available: true };
    } catch (error) {
      // Service might be down
      return { available: false };
    }
  }
}