/**
 * Internet Archive service implementation
 */

import { BaseArchiveService } from './BaseArchiveService';
import { ArchiveResult, ArchiveError, ArchiveErrorType } from './types';

export class InternetArchiveService extends BaseArchiveService {
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor() {
    super({
      name: 'Internet Archive',
      id: 'internetarchive',
      requiresAuth: false,
      supportsMemento: true,
      rateLimit: 2000 // 2 seconds between requests
    });
    
    this.reloadSettings();
  }

  async isAvailable(): Promise<boolean> {
    return true; // Internet Archive is always available
  }

  async archive(items: Zotero.Item[]): Promise<ArchiveResult[]> {
    const results: ArchiveResult[] = [];

    for (const item of items) {
      try {
        const result = await this.archiveItem(item);
        results.push(result);
      } catch (error) {
        results.push({
          item,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  private async archiveItem(item: Zotero.Item): Promise<ArchiveResult> {
    // Reload settings in case they changed
    this.reloadSettings();
    
    const url = this.getBestUrl(item);

    if (!this.checkValidUrl(url)) {
      throw new ArchiveError(ArchiveErrorType.InvalidUrl, 'Invalid URL for archiving');
    }

    if (this.isArchived(item)) {
      return {
        item,
        success: true,
        message: 'Already archived'
      };
    }

    await this.checkRateLimit();

    const progressWindow = this.createProgressWindow();
    progressWindow.show(
      'Archiving to Internet Archive',
      `Archiving: ${item.getField('title') || url}`
    );

    let lastError: Error | null = null;
    let attempt = 0;
    let currentTimeout = this.timeout;

    while (attempt < this.maxRetries) {
      try {
        if (attempt > 0) {
          progressWindow.update(`Retry attempt ${attempt} of ${this.maxRetries - 1}...`);
          await this.delay(this.retryDelay);
        }

        const archiveUrl = `https://web.archive.org/save/${url}`;
        const response = await Zotero.HTTP.request('GET', archiveUrl, {
          headers: {
            'User-Agent': 'Zotero Moment-o7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: currentTimeout,
          responseType: 'text'
        });

        this.updateLastRequest();

        const archivedUrl = this.extractArchivedUrl(response);

        if (archivedUrl) {
          await this.saveToItem(item, archivedUrl);
          item.addTag('archived');
          await item.saveTx();

          progressWindow.success(`Archived successfully: ${archivedUrl}`);

          return {
            item,
            success: true,
            archivedUrl
          };
        } else {
          throw new Error('Could not extract archived URL from response');
        }

      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Don't retry for certain errors
        const archiveError = error instanceof ArchiveError ? error : this.mapHttpError(error);
        if (
          archiveError.type === ArchiveErrorType.Blocked ||
          archiveError.type === ArchiveErrorType.NotFound ||
          archiveError.type === ArchiveErrorType.InvalidUrl
        ) {
          break;
        }

        // For timeout errors, increase timeout for next attempt
        if (archiveError.type === ArchiveErrorType.Timeout) {
          currentTimeout = Math.min(currentTimeout * 1.5, 300000); // Max 5 minutes
        }
      }
    }

    // All retries failed
    progressWindow.close();
    
    const finalError = lastError instanceof ArchiveError 
      ? lastError 
      : this.mapHttpError(lastError);
    
    if (finalError.type === ArchiveErrorType.Timeout) {
      throw new ArchiveError(
        ArchiveErrorType.Timeout,
        `Archive request timed out after ${attempt} attempts - the site may be slow or blocking archiving`
      );
    }
    
    throw finalError;
  }

  private extractArchivedUrl(response: any): string | null {
    // Try to get from Link header first
    const linkHeader = response.getResponseHeader('Link');
    if (linkHeader) {
      const matches = linkHeader.match(/<([^>]+)>;\s*rel="memento"/g);
      if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const urlMatch = lastMatch.match(/<([^>]+)>/);
        if (urlMatch) {
          return urlMatch[1];
        }
      }
    }

    // If not in header, try to extract from response
    if (response.responseText) {
      const match = response.responseText.match(/https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  private isArchived(item: Zotero.Item): boolean {
    const tags = item.getTags();
    return tags.some(tag => tag.tag === 'archived');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => Zotero.setTimeout(resolve, ms));
  }

  private reloadSettings(): void {
    this.timeout = Zotero.Prefs.get('extensions.momento7.iaTimeout', 120000);
    this.maxRetries = Zotero.Prefs.get('extensions.momento7.iaMaxRetries', 3);
    this.retryDelay = Zotero.Prefs.get('extensions.momento7.iaRetryDelay', 5000);
  }
}