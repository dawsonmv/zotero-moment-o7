/**
 * Base class for all archive services
 */

import { 
  ArchiveService, 
  ServiceConfig, 
  ArchiveResult, 
  ArchiveError, 
  ArchiveErrorType,
  ProgressWindow 
} from './types';

export abstract class BaseArchiveService implements ArchiveService {
  protected lastRequest: number | null = null;
  
  constructor(protected config: ServiceConfig) {}

  get name(): string {
    return this.config.name;
  }

  get id(): string {
    return this.config.id;
  }

  abstract isAvailable(): Promise<boolean>;
  abstract archive(items: Zotero.Item[]): Promise<ArchiveResult[]>;

  /**
   * Check if URL is valid for archiving
   */
  checkValidUrl(url: string): boolean {
    return /^https?:\/\/.+/.test(url);
  }

  /**
   * Get the best URL for archiving (prefer DOI if available)
   */
  getBestUrl(item: Zotero.Item): string {
    const doi = item.getField('DOI');
    if (doi) {
      return `https://doi.org/${doi}`;
    }
    return item.getField('url') || '';
  }

  /**
   * Check rate limiting
   */
  protected async checkRateLimit(): Promise<void> {
    if (!this.config.rateLimit || !this.lastRequest) {
      return;
    }

    const timeSinceLastRequest = Date.now() - this.lastRequest;
    if (timeSinceLastRequest < this.config.rateLimit) {
      const waitTime = Math.ceil((this.config.rateLimit - timeSinceLastRequest) / 1000);
      throw new ArchiveError(
        ArchiveErrorType.RateLimit,
        `Rate limit: Please wait ${waitTime} seconds before trying again`,
        429,
        waitTime
      );
    }
  }

  /**
   * Update last request timestamp
   */
  protected updateLastRequest(): void {
    this.lastRequest = Date.now();
  }

  /**
   * Create robust link HTML
   */
  protected createRobustLinkHTML(
    originalUrl: string,
    archivedUrl: string,
    linkText: string,
    useArchivedHref = false
  ): string {
    const versionDate = new Date().toISOString();
    const href = useArchivedHref ? archivedUrl : originalUrl;
    return `<a href="${this.escapeHtml(href)}" data-originalurl="${this.escapeHtml(originalUrl)}" data-versionurl="${this.escapeHtml(archivedUrl)}" data-versiondate="${versionDate}">${this.escapeHtml(linkText)}</a>`;
  }

  /**
   * Escape HTML for safe insertion
   */
  protected escapeHtml(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Save archive URL to item
   */
  protected async saveToItem(
    item: Zotero.Item,
    archivedUrl: string,
    metadata: { additionalInfo?: string } = {}
  ): Promise<void> {
    const originalUrl = item.getField('url');
    const linkText = item.getField('title') || originalUrl;

    // Update extra field
    let extra = item.getField('extra') || '';
    const archiveField = `${this.id}Archived: ${archivedUrl}`;
    if (!extra.includes(archiveField)) {
      extra = extra ? extra + '\n' + archiveField : archiveField;
      item.setField('extra', extra);
    }

    // Create note with robust link
    const robustLinkHTML = this.createRobustLinkHTML(originalUrl, archivedUrl, linkText);
    const noteContent = `<p>Archived version: ${robustLinkHTML}</p>
<p>Archive date: ${new Date().toLocaleDateString()}</p>
<p>Archive service: ${this.name}</p>
${metadata.additionalInfo ? `<p>${metadata.additionalInfo}</p>` : ''}

<p><strong>Robust Link HTML (copy and paste):</strong></p>
<pre>${this.escapeHtml(robustLinkHTML)}</pre>`;

    const note = new Zotero.Item('note');
    note.setNote(noteContent);
    note.parentID = item.id;
    await note.saveTx();
  }

  /**
   * Create progress window wrapper
   */
  protected createProgressWindow(): ProgressWindow {
    let progressWindow: Zotero.ProgressWindow | null = null;

    return {
      show(title: string, message?: string) {
        progressWindow = new Zotero.ProgressWindow({ closeOnClick: false });
        progressWindow.changeHeadline(title);
        if (message) {
          progressWindow.addDescription(message);
        }
        progressWindow.show();
      },
      
      update(message: string) {
        if (progressWindow) {
          progressWindow.addDescription(message);
        }
      },
      
      close() {
        if (progressWindow) {
          progressWindow.close();
        }
      },
      
      error(message: string) {
        if (progressWindow) {
          progressWindow.close();
        }
        const errorWindow = new Zotero.ProgressWindow({ closeOnClick: true });
        errorWindow.changeHeadline(`${this.name} Error`);
        errorWindow.addDescription(message);
        errorWindow.show();
        errorWindow.startCloseTimer(5000);
      },
      
      success(message: string) {
        if (progressWindow) {
          progressWindow.close();
        }
        const successWindow = new Zotero.ProgressWindow({ closeOnClick: true });
        successWindow.changeHeadline(`${this.name} Success`);
        successWindow.addDescription(message);
        successWindow.show();
        successWindow.startCloseTimer(3000);
      }
    };
  }

  /**
   * Map HTTP error to ArchiveError
   */
  protected mapHttpError(error: any): ArchiveError {
    const status = error.status || error.statusCode;
    
    switch (status) {
      case 429:
        return new ArchiveError(
          ArchiveErrorType.RateLimit,
          'Rate limited. Please wait before trying again.',
          429
        );
      case 401:
      case 403:
        if (this.config.requiresAuth) {
          return new ArchiveError(
            ArchiveErrorType.AuthRequired,
            'Authentication required or invalid.',
            status
          );
        }
        return new ArchiveError(
          ArchiveErrorType.Blocked,
          'Access denied - this site blocks archiving services.',
          status
        );
      case 404:
        return new ArchiveError(
          ArchiveErrorType.NotFound,
          'The URL could not be found.',
          404
        );
      case 523:
        return new ArchiveError(
          ArchiveErrorType.Blocked,
          'This site cannot be archived (blocked by publisher).',
          523
        );
      default:
        if (status >= 500) {
          return new ArchiveError(
            ArchiveErrorType.ServerError,
            'Archive service is temporarily unavailable.',
            status
          );
        }
        if (error.message?.includes('timeout')) {
          return new ArchiveError(
            ArchiveErrorType.Timeout,
            'Archive request timed out.',
            0
          );
        }
        return new ArchiveError(
          ArchiveErrorType.Unknown,
          error.message || 'An unknown error occurred.',
          status
        );
    }
  }
}