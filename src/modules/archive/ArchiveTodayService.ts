import { BaseArchiveService } from "./BaseArchiveService";
import { SingleArchiveResult, ArchiveProgress } from "./types";
import { PreferencesManager } from "../preferences/PreferencesManager";

export class ArchiveTodayService extends BaseArchiveService {
  // Proxy availability is tracked per-session
  private proxyAvailable: boolean = true;

  constructor() {
    super({
      id: "archivetoday",
      name: "Archive.today",
      homepage: "https://archive.today",
      capabilities: {
        acceptsUrl: true,
        returnsUrl: true,
        preservesJavaScript: true,
        preservesInteractiveElements: true,
      },
    });
  }

  async isAvailable(): Promise<boolean> {
    return true; // Archive.today is generally available
  }

  protected async archiveUrl(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    try {
      // Check if a proxy URL is configured
      const proxyUrl = PreferencesManager.getArchiveTodayProxyUrl();

      // Try proxy first if configured and available
      if (proxyUrl && this.proxyAvailable) {
        try {
          const result = await this.archiveViaProxy(url, proxyUrl, progress);
          if (result.success) {
            return result;
          }
        } catch (error) {
          Zotero.debug(
            `Moment-o7: Archive.today proxy failed, falling back to direct: ${error}`,
          );
          this.proxyAvailable = false;
        }
      }

      // Direct submission (may fail due to CORS in some contexts)
      return await this.archiveDirectly(url, progress);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Archive via a configured proxy (e.g., Cloudflare Worker)
   * Users can deploy their own proxy to handle CORS issues
   */
  private async archiveViaProxy(
    url: string,
    proxyUrl: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    progress?.onStatusUpdate(`Submitting ${url} to Archive.today via proxy...`);

    const timeout = PreferencesManager.getTimeout();
    const response = await this.makeHttpRequest(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      timeout,
    });

    if (!response.success) {
      throw new Error(response.error || "Proxy request failed");
    }

    const data = JSON.parse(response.data);

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.archivedUrl) {
      throw new Error("No archived URL returned from proxy");
    }

    return {
      success: true,
      url: data.archivedUrl,
      metadata: {
        originalUrl: url,
        archiveDate: new Date().toISOString(),
        service: this.config.name,
      },
    };
  }

  private async archiveDirectly(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    progress?.onStatusUpdate(`Submitting ${url} directly to Archive.today...`);

    const timeout = PreferencesManager.getTimeout();

    // Submit to Archive.today
    const submitResponse = await this.makeHttpRequest(
      "https://archive.today/submit/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `url=${encodeURIComponent(url)}`,
        timeout,
      },
    );

    if (!submitResponse.success) {
      throw new Error(submitResponse.error || "Direct submission failed");
    }

    // Extract the archived URL from response
    const archivedUrl = this.extractArchivedUrl(submitResponse.data);

    if (!archivedUrl) {
      throw new Error("Could not extract archived URL from response");
    }

    return {
      success: true,
      url: archivedUrl,
      metadata: {
        originalUrl: url,
        archiveDate: new Date().toISOString(),
        service: this.config.name,
      },
    };
  }

  private extractArchivedUrl(html: string): string | null {
    // Look for the archived URL in various patterns
    const patterns = [
      /https?:\/\/archive\.(today|is|ph|md|li)\/[A-Za-z0-9]+/,
      /<input[^>]+id="SHARE_LONGLINK"[^>]+value="([^"]+)"/,
      /<a[^>]+href="(https?:\/\/archive\.[^"]+)"[^>]*>.*?View\s+snapshot/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match.length > 1 && match[1]) {
        return match[1];
      }
      if (match && match[0]) {
        return match[0];
      }
    }

    return null;
  }

  async checkAvailability(
    url: string,
  ): Promise<{ available: boolean; existingUrl?: string }> {
    try {
      // Check if URL is already archived
      const checkUrl = `https://archive.today/${encodeURIComponent(url)}`;
      const response = await this.makeHttpRequest(checkUrl, {
        method: "GET",
        timeout: 30000,
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

  /**
   * Test Archive.today proxy URL connection
   * Validates that a configured proxy URL is accessible and working
   * @static
   */
  static async testCredentials(credentials: {
    proxyUrl?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Proxy URL is optional for Archive.today
      if (!credentials.proxyUrl || credentials.proxyUrl.length === 0) {
        return {
          success: true,
          message: "No proxy configured (using direct submission)",
        };
      }

      // Validate URL format
      try {
        new URL(credentials.proxyUrl);
      } catch {
        return {
          success: false,
          message: "Invalid proxy URL format",
        };
      }

      const timeout = 10000; // 10 second timeout for test

      // Make a test request to the proxy URL
      const response = await Zotero.HTTP.request(
        credentials.proxyUrl,
        {
          method: "POST",
          timeout,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: "https://example.com" }),
        },
      );

      // Check for connectivity errors
      if (response.status >= 400) {
        return {
          success: false,
          message: `Proxy returned HTTP ${response.status}`,
        };
      }

      // Success if proxy is reachable and responding
      return {
        success: true,
        message: "Proxy URL is accessible",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Connection error: ${message}`,
      };
    }
  }
}
