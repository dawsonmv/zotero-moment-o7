import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult, ArchiveProgress } from './types';
import { PreferencesManager } from '../preferences/PreferencesManager';

export class ArquivoPtService extends BaseArchiveService {
  private static readonly API_BASE = 'https://arquivo.pt';
  private static readonly SAVE_URL = 'https://arquivo.pt/save';
  
  constructor() {
    super({
      id: 'arquivopt',
      name: 'Arquivo.pt',
      homepage: 'https://arquivo.pt',
      capabilities: {
        acceptsUrl: true,
        returnsUrl: true,
        preservesJavaScript: false,
        preservesInteractiveElements: false,
        regionRestricted: true // Portuguese Web Archive
      }
    });
  }

  async archive(url: string, progress?: ArchiveProgress): Promise<ArchiveResult> {
    try {
      progress?.onStatusUpdate(`Submitting ${url} to Arquivo.pt...`);
      
      const timeout = PreferencesManager.getTimeout('arquivopt');
      
      // First, check if already archived
      const existingArchive = await this.findExistingArchive(url);
      if (existingArchive) {
        return {
          success: true,
          url: existingArchive,
          metadata: {
            originalUrl: url,
            archiveDate: new Date().toISOString(),
            service: this.config.name,
            status: 'existing'
          }
        };
      }
      
      // Submit for archiving
      const response = await this.makeHttpRequest(
        ArquivoPtService.SAVE_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `url=${encodeURIComponent(url)}`,
          timeout
        }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to submit to Arquivo.pt'
        };
      }

      // Try to extract the archived URL from response
      const archivedUrl = this.extractArchivedUrl(response.data, url);
      
      if (archivedUrl) {
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

      // If we can't extract URL, but submission was successful
      return {
        success: true,
        url: `${ArquivoPtService.API_BASE}/wayback/*/${url}`,
        metadata: {
          originalUrl: url,
          archiveDate: new Date().toISOString(),
          service: this.config.name,
          note: 'Archive submitted. Full URL will be available after processing.'
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private extractArchivedUrl(html: string, originalUrl: string): string | null {
    // Look for wayback URL patterns
    const patterns = [
      /https?:\/\/arquivo\.pt\/wayback\/\d{14}\/[^"'\s]+/i,
      new RegExp(`https?://arquivo\\.pt/wayback/\\d{14}/${this.escapeRegExp(originalUrl)}`, 'i'),
      /<a[^>]+href="(\/wayback\/\d{14}\/[^"]+)"/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const url = match[1] || match[0];
        // Convert relative URL to absolute if needed
        if (url.startsWith('/')) {
          return `${ArquivoPtService.API_BASE}${url}`;
        }
        return url;
      }
    }

    return null;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async findExistingArchive(url: string): Promise<string | null> {
    try {
      // Check if URL is already archived
      const checkUrl = `${ArquivoPtService.API_BASE}/wayback/*/${url}`;
      
      const response = await this.makeHttpRequest(checkUrl, {
        method: 'GET',
        timeout: 30000
      });

      if (response.success && response.status === 200) {
        // Extract the most recent archive URL
        const timestampPattern = /\/wayback\/(\d{14})\//g;
        const matches = [...response.data.matchAll(timestampPattern)];
        
        if (matches.length > 0) {
          // Get the most recent timestamp
          const timestamps = matches.map(m => m[1]).sort().reverse();
          const mostRecent = timestamps[0];
          
          return `${ArquivoPtService.API_BASE}/wayback/${mostRecent}/${url}`;
        }
      }
    } catch (error) {
      console.warn('Failed to check existing Arquivo.pt archive:', error);
    }
    
    return null;
  }

  async checkAvailability(url: string): Promise<{ available: boolean; existingUrl?: string }> {
    try {
      // Check if service is responding
      const response = await this.makeHttpRequest(ArquivoPtService.API_BASE, {
        method: 'GET',
        timeout: 30000
      });

      if (!response.success) {
        return { available: false };
      }

      // Check for existing archive
      const existingArchive = await this.findExistingArchive(url);
      
      if (existingArchive) {
        return { available: true, existingUrl: existingArchive };
      }

      return { available: true };
      
    } catch (error) {
      return { available: false };
    }
  }
}