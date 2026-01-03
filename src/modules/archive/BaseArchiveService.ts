/**
 * Base class for all archive services
 * Wraps HTTP requests with traffic monitoring for performance tracking
 */

import {
  ArchiveService,
  ServiceConfig,
  ArchiveResult,
  ArchiveError,
  ArchiveErrorType,
  ProgressWindow,
  SingleArchiveResult,
  ArchiveProgress,
  HTTPRequestOptions,
} from "./types";
import { TrafficMonitor } from "../../utils/TrafficMonitor";
import {
  CircuitBreakerManager,
  CircuitBreakerError,
} from "../../utils/CircuitBreaker";
import { ExtraFieldParser } from "./ExtraFieldParser";

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

  /**
   * Archive a single URL - to be implemented by subclasses
   */
  protected abstract archiveUrl(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult>;

  /**
   * Archive multiple items
   */
  async archive(items: Zotero.Item[]): Promise<ArchiveResult[]> {
    const results: ArchiveResult[] = [];
    const progress = this.createProgressWindow();

    progress.show(
      `Archiving with ${this.name}`,
      `Processing ${items.length} items...`,
    );

    for (const item of items) {
      try {
        const url = this.getBestUrl(item);
        if (!url || !this.checkValidUrl(url)) {
          results.push({
            item,
            success: false,
            error: "No valid URL found",
          });
          continue;
        }

        progress.update(`Archiving: ${url}`);
        const result = await this.archiveUrl(url, {
          onStatusUpdate: (status) => progress.update(status),
        });

        if (result.success && result.url) {
          await this.saveToItem(item, result.url);
          results.push({
            item,
            success: true,
            archivedUrl: result.url,
            service: this.name,
          });
        } else {
          results.push({
            item,
            success: false,
            error: result.error || "Archive failed",
          });
        }
      } catch (error) {
        results.push({
          item,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    progress.close();
    return results;
  }

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
    const doiField = item.getField("DOI");
    const doi = typeof doiField === "string" ? doiField : null;
    if (doi) {
      return `https://doi.org/${doi}`;
    }
    const urlField = item.getField("url");
    const url = typeof urlField === "string" ? urlField : "";
    return url;
  }

  /**
   * Make HTTP request with traffic monitoring and circuit breaker protection
   * Wraps request with TrafficMonitor to track service response times
   * and CircuitBreaker to prevent cascading failures
   * Uses 1-second delayed timer start to account for network overhead
   */
  protected async makeHttpRequest(
    url: string,
    options: HTTPRequestOptions,
  ): Promise<{ success: boolean; data: any; error?: string; status?: number }> {
    // Get circuit breaker for this service
    const breakerManager = CircuitBreakerManager.getInstance();
    const breaker = breakerManager.getBreaker(this.id, {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      volumeThreshold: 10,
      // Only count service failures, not client errors
      errorFilter: (error: Error) => {
        // If it's a CircuitBreakerError, don't count it as a failure (it's a rejection)
        if (error instanceof CircuitBreakerError) {
          return false;
        }
        // If it's an ArchiveError, only count service failures
        if (error instanceof ArchiveError) {
          return [
            ArchiveErrorType.ServerError,
            ArchiveErrorType.Timeout,
            ArchiveErrorType.RateLimit,
          ].includes(error.type);
        }
        // Count other unexpected errors as failures
        return true;
      },
    });

    // Execute HTTP request with circuit breaker protection
    try {
      return await breaker.execute(
        // Main operation: perform HTTP request
        async () => {
          const trafficMonitor = TrafficMonitor.getInstance();
          const requestId = `${this.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Track whether monitoring has started
          let monitoringStarted = false;

          // Schedule traffic monitoring to start after 1 second delay
          // This accounts for network overhead before actual transfer begins
          const timerHandle = Zotero.setTimeout(() => {
            monitoringStarted = true;
            trafficMonitor.startRequest(requestId, this.id, url);
          }, 1000);

          try {
            const requestOptions = {
              ...options,
              method: options.method || "GET",
            };
            const response = await Zotero.HTTP.request(url, requestOptions as any);

            // Clear timer if request completed before 1 second
            if (!monitoringStarted) {
              Zotero.clearTimeout(timerHandle);
              // Fast response (< 1s): no score recorded
            } else {
              // Slow response (>= 1s): record success
              trafficMonitor.endRequest(requestId, true);
            }

            return {
              success: true,
              data: response.responseText,
              status: response.status,
            };
          } catch (error: any) {
            // Clear timer if request failed before 1 second
            if (!monitoringStarted) {
              Zotero.clearTimeout(timerHandle);
              // Fast failure (< 1s): no score recorded
            } else {
              // Slow failure (>= 1s): record failure
              trafficMonitor.endRequest(requestId, false);
            }

            // Re-throw error to be caught by circuit breaker
            throw error;
          }
        },
        // Fallback: return error response when circuit is OPEN
        async () => ({
          success: true,
          data: "",
          status: 503, // Service Unavailable
        }),
      );
    } catch (error: any) {
      // Handle circuit breaker errors by returning error response
      return {
        success: false,
        data: "",
        error: error instanceof CircuitBreakerError
          ? `${this.name} is temporarily unavailable (circuit breaker ${error.state})`
          : error.message || "Request failed",
        status: error instanceof CircuitBreakerError ? 503 : error.status,
      };
    }
  }

  /**
   * Check rate limiting
   */
  protected async checkRateLimit(): Promise<void> {
    // Rate limiting removed from config, but keeping method for compatibility
    if (!this.lastRequest) {
      return;
    }

    const timeSinceLastRequest = Date.now() - this.lastRequest;
    const minDelay = 1000; // 1 second minimum between requests
    if (timeSinceLastRequest < minDelay) {
      const waitTime = Math.ceil((minDelay - timeSinceLastRequest) / 1000);
      throw new ArchiveError(
        ArchiveErrorType.RateLimit,
        `Rate limit: Please wait ${waitTime} seconds before trying again`,
        429,
        waitTime,
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
    useArchivedHref = false,
  ): string {
    const versionDate = new Date().toISOString();
    const href = useArchivedHref ? archivedUrl : originalUrl;
    return `<a href="${this.escapeHtml(href)}" data-originalurl="${this.escapeHtml(originalUrl)}" data-versionurl="${this.escapeHtml(archivedUrl)}" data-versiondate="${versionDate}">${this.escapeHtml(linkText)}</a>`;
  }

  /**
   * Escape HTML for safe insertion
   */
  protected escapeHtml(text: string): string {
    if (!text) return "";
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Save archive URL to item
   */
  protected async saveToItem(
    item: Zotero.Item,
    archivedUrl: string,
    metadata: { additionalInfo?: string } = {},
  ): Promise<void> {
    const originalUrlField = item.getField("url");
    const originalUrl =
      typeof originalUrlField === "string" ? originalUrlField : "";

    const titleField = item.getField("title");
    const linkText =
      typeof titleField === "string" && titleField ? titleField : originalUrl;

    // Update extra field using standardized format
    const extraField = item.getField("extra");
    const extra = typeof extraField === "string" ? extraField : "";
    const updatedExtra = ExtraFieldParser.writeArchiveUrl(extra, this.id, archivedUrl);
    if (updatedExtra !== extra) {
      item.setField("extra", updatedExtra);
    }

    // Create note with robust link
    const robustLinkHTML = this.createRobustLinkHTML(
      originalUrl,
      archivedUrl,
      linkText,
    );
    const noteContent = `<p>Archived version: ${robustLinkHTML}</p>
<p>Archive date: ${new Date().toLocaleDateString()}</p>
<p>Archive service: ${this.name}</p>
${metadata.additionalInfo ? `<p>${metadata.additionalInfo}</p>` : ""}

<p><strong>Robust Link HTML (copy and paste):</strong></p>
<pre>${this.escapeHtml(robustLinkHTML)}</pre>`;

    const note = new (Zotero.Item as any)("note");
    note.setNote(noteContent);
    note.parentID = item.id;
    await note.saveTx();
  }

  /**
   * Create progress window wrapper
   */
  protected createProgressWindow(): ProgressWindow {
    let progressWindow: InstanceType<typeof Zotero.ProgressWindow> | null =
      null;

    return {
      show(title: string, message?: string) {
        progressWindow = new (Zotero.ProgressWindow as any)({
          closeOnClick: false,
        });
        progressWindow!.changeHeadline(title);
        if (message) {
          progressWindow!.addDescription(message);
        }
        progressWindow!.show();
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
        const errorWindow = new (Zotero.ProgressWindow as any)({
          closeOnClick: true,
        });
        errorWindow.changeHeadline(`${(this as any).name} Error`);
        errorWindow.addDescription(message);
        errorWindow.show();
        errorWindow.startCloseTimer(5000);
      },

      success(message: string) {
        if (progressWindow) {
          progressWindow.close();
        }
        const successWindow = new (Zotero.ProgressWindow as any)({
          closeOnClick: true,
        });
        successWindow.changeHeadline(`${(this as any).name} Success`);
        successWindow.addDescription(message);
        successWindow.show();
        successWindow.startCloseTimer(3000);
      },
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
          "Rate limited. Please wait before trying again.",
          429,
        );
      case 401:
      case 403:
        if (this.config.capabilities?.requiresAuthentication) {
          return new ArchiveError(
            ArchiveErrorType.AuthRequired,
            "Authentication required or invalid.",
            status,
          );
        }
        return new ArchiveError(
          ArchiveErrorType.Blocked,
          "Access denied - this site blocks archiving services.",
          status,
        );
      case 404:
        return new ArchiveError(
          ArchiveErrorType.NotFound,
          "The URL could not be found.",
          404,
        );
      case 523:
        return new ArchiveError(
          ArchiveErrorType.Blocked,
          "This site cannot be archived (blocked by publisher).",
          523,
        );
      default:
        if (status >= 500) {
          return new ArchiveError(
            ArchiveErrorType.ServerError,
            "Archive service is temporarily unavailable.",
            status,
          );
        }
        if (error.message?.includes("timeout")) {
          return new ArchiveError(
            ArchiveErrorType.Timeout,
            "Archive request timed out.",
            0,
          );
        }
        return new ArchiveError(
          ArchiveErrorType.Unknown,
          error.message || "An unknown error occurred.",
          status,
        );
    }
  }
}
