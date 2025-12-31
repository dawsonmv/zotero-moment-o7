/**
 * Internet Archive service implementation
 * Supports both authenticated (SPN2 API) and unauthenticated archiving
 */

import { BaseArchiveService } from "./BaseArchiveService";
import {
  SingleArchiveResult,
  ArchiveError,
  ArchiveErrorType,
  ArchiveProgress,
} from "./types";
import { PreferencesManager } from "../preferences/PreferencesManager";

// Regex to validate API credentials (alphanumeric, dashes, underscores only)
const CREDENTIAL_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validate that a credential contains only safe characters
 * Prevents header injection attacks
 */
function isValidCredential(value: string | undefined): boolean {
  if (!value || value.length === 0) return false;
  if (value.length > 256) return false; // Reasonable max length
  return CREDENTIAL_PATTERN.test(value);
}

export class InternetArchiveService extends BaseArchiveService {
  private timeout!: number;
  private maxRetries!: number;
  private retryDelay!: number;

  constructor() {
    super({
      name: "Internet Archive",
      id: "internetarchive",
      homepage: "https://archive.org",
      capabilities: {
        acceptsUrl: true,
        returnsUrl: true,
        preservesJavaScript: true,
        preservesInteractiveElements: true,
      },
    });

    this.reloadSettings();
  }

  async isAvailable(): Promise<boolean> {
    return true; // Internet Archive is always available
  }

  protected async archiveUrl(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    // Reload settings in case they changed
    this.reloadSettings();

    // Check if we have API credentials (async for secure credential access)
    const hasCredentials = await PreferencesManager.hasIACredentials();

    if (hasCredentials) {
      return this.archiveWithSPN2(url, progress);
    } else {
      return this.archiveWithPublicAPI(url, progress);
    }
  }

  /**
   * Archive using the authenticated SPN2 API
   */
  private async archiveWithSPN2(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    const credentials = await PreferencesManager.getIACredentials();

    // Validate credentials to prevent header injection
    if (
      !isValidCredential(credentials.accessKey) ||
      !isValidCredential(credentials.secretKey)
    ) {
      return {
        success: false,
        error:
          "Invalid API credentials format. Credentials must contain only alphanumeric characters, dashes, and underscores.",
      };
    }

    let lastError: Error = new Error("Unknown error");
    let attempt = 0;

    while (attempt < this.maxRetries) {
      if (attempt > 0) {
        progress?.onStatusUpdate(
          `Retrying (attempt ${attempt + 1}/${this.maxRetries})...`,
        );
        await this.delay(this.retryDelay);
      }

      try {
        progress?.onStatusUpdate(
          `Submitting ${url} to Internet Archive (authenticated)...`,
        );

        const response = await Zotero.HTTP.request(
          "https://web.archive.org/save",
          {
            method: "POST",
            timeout: this.timeout,
            headers: {
              Accept: "application/json",
              Authorization: `LOW ${credentials.accessKey}:${credentials.secretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `url=${encodeURIComponent(url)}`,
          },
        );

        const result = JSON.parse(response.responseText || "{}");

        if (result.url) {
          return {
            success: true,
            url: result.url,
            metadata: {
              originalUrl: url,
              archiveDate: new Date().toISOString(),
              service: this.name,
              jobId: result.job_id,
            },
          };
        } else if (result.job_id) {
          // Job submitted, poll for result
          progress?.onStatusUpdate(
            "Archive job submitted, waiting for completion...",
          );
          const archivedUrl = await this.pollJobStatus(
            result.job_id,
            credentials,
            progress,
          );
          if (archivedUrl) {
            return {
              success: true,
              url: archivedUrl,
              metadata: {
                originalUrl: url,
                archiveDate: new Date().toISOString(),
                service: this.name,
                jobId: result.job_id,
              },
            };
          }
        }

        throw new Error(result.message || "Failed to archive URL");
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const archiveError =
          error instanceof ArchiveError ? error : this.mapHttpError(error);
        if (
          archiveError.type === ArchiveErrorType.Blocked ||
          archiveError.type === ArchiveErrorType.NotFound ||
          archiveError.type === ArchiveErrorType.InvalidUrl
        ) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError.message,
    };
  }

  /**
   * Poll the SPN2 job status endpoint
   */
  private async pollJobStatus(
    jobId: string,
    credentials: { accessKey?: string; secretKey?: string },
    progress?: ArchiveProgress,
  ): Promise<string | null> {
    // Credentials already validated in archiveWithSPN2, but double-check
    if (
      !isValidCredential(credentials.accessKey) ||
      !isValidCredential(credentials.secretKey)
    ) {
      return null;
    }

    const maxPolls = 30;
    const pollInterval = 2000;

    for (let i = 0; i < maxPolls; i++) {
      await this.delay(pollInterval);

      try {
        const response = await Zotero.HTTP.request(
          `https://web.archive.org/save/status/${jobId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `LOW ${credentials.accessKey}:${credentials.secretKey}`,
            },
          },
        );

        const result = JSON.parse(response.responseText || "{}");

        if (result.status === "success") {
          return `https://web.archive.org/web/${result.timestamp}/${result.original_url}`;
        } else if (result.status === "error") {
          throw new Error(result.message || "Archive job failed");
        }

        progress?.onStatusUpdate(
          `Archive in progress... (${i + 1}/${maxPolls})`,
        );
      } catch (error) {
        // Continue polling on non-fatal errors
      }
    }

    return null;
  }

  /**
   * Archive using the public (unauthenticated) API - may fail if login required
   */
  private async archiveWithPublicAPI(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    let lastError: Error = new Error("Unknown error");
    let attempt = 0;
    let currentTimeout = this.timeout;

    // Retry logic
    while (attempt < this.maxRetries) {
      if (attempt > 0) {
        progress?.onStatusUpdate(
          `Retrying (attempt ${attempt + 1}/${this.maxRetries})...`,
        );
        await this.delay(this.retryDelay);
      }

      try {
        progress?.onStatusUpdate(`Submitting ${url} to Internet Archive...`);

        const response = await Zotero.HTTP.request(
          `https://web.archive.org/save/${url}`,
          {
            timeout: currentTimeout,
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Zotero)",
            },
          },
        );

        const archivedUrl = this.extractArchivedUrl(response);
        if (archivedUrl) {
          return {
            success: true,
            url: archivedUrl,
            metadata: {
              originalUrl: url,
              archiveDate: new Date().toISOString(),
              service: this.name,
            },
          };
        } else {
          throw new Error("Could not extract archived URL from response");
        }
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check for auth required error
        if ((error as any)?.status === 401 || (error as any)?.status === 403) {
          return {
            success: false,
            error:
              "Internet Archive requires authentication. Please add your API keys in Moment-o7 preferences.",
          };
        }

        // Don't retry for certain errors
        const archiveError =
          error instanceof ArchiveError ? error : this.mapHttpError(error);
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
    const finalError =
      lastError instanceof ArchiveError
        ? lastError
        : this.mapHttpError(lastError);

    if (finalError.type === ArchiveErrorType.Timeout) {
      return {
        success: false,
        error: `Archive request timed out after ${attempt} attempts - the site may be slow or blocking archiving`,
      };
    }

    return {
      success: false,
      error: finalError.message,
    };
  }

  private extractArchivedUrl(response: any): string | null {
    // Try to get from Link header first
    const linkHeader = response.getResponseHeader("Link");
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
      const match = response.responseText.match(
        /https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/,
      );
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => Zotero.setTimeout(resolve, ms));
  }

  private reloadSettings(): void {
    this.timeout = PreferencesManager.getTimeout();
    this.maxRetries =
      (Zotero.Prefs.get("extensions.momento7.iaMaxRetries") as number) || 3;
    this.retryDelay =
      (Zotero.Prefs.get("extensions.momento7.iaRetryDelay") as number) || 5000;
  }
}
