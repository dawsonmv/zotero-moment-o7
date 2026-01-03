/**
 * Configurable Archive Service
 *
 * Generic implementation of ArchiveService driven by ServiceConfig.runtime
 * Handles HTTP-based archive services with simple request/response patterns
 * without requiring custom TypeScript code.
 */

import {
  ServiceConfig,
  SingleArchiveResult,
  ArchiveProgress,
  ArchiveErrorType,
  ArchiveError,
} from "./types";
import { BaseArchiveService } from "./BaseArchiveService";
import { CredentialManager } from "../../utils/CredentialManager";

export class ConfigurableArchiveService extends BaseArchiveService {
  constructor(config: ServiceConfig) {
    if (!config.runtime) {
      throw new Error(
        `ConfigurableArchiveService requires runtime configuration for service ${config.id}`,
      );
    }
    super(config);
  }

  async isAvailable(): Promise<boolean> {
    // If service requires authentication, check if credentials exist
    if (this.config.runtime?.auth) {
      const credManager = CredentialManager.getInstance();
      try {
        const credential = await credManager.get(
          this.config.runtime.auth.credentialKey,
        );
        return !!credential;
      } catch {
        return false;
      }
    }

    // Service is available if no auth required
    return true;
  }

  protected async archiveUrl(
    url: string,
    progress?: ArchiveProgress,
  ): Promise<SingleArchiveResult> {
    const runtime = this.config.runtime!;

    try {
      // 1. Validate URL if validator configured
      if (runtime.urlValidator) {
        const validationResult = this.validateUrl(url);
        if (!validationResult.valid) {
          return {
            success: false,
            error: validationResult.error,
          };
        }
      }

      // 2. Check existing archives if checkEndpoint configured
      if (runtime.checkEndpoint) {
        progress?.onStatusUpdate?.(
          `Checking for existing archives on ${this.name}...`,
        );
        const existingUrl = await this.checkExisting(url);
        if (existingUrl) {
          return {
            success: true,
            url: existingUrl,
            metadata: {
              originalUrl: url,
              archiveDate: new Date().toISOString(),
              service: this.name,
            },
          };
        }
      }

      // 3. Submit archive request
      progress?.onStatusUpdate?.(
        `Submitting ${url.substring(0, 50)}... to ${this.name}...`,
      );

      await this.checkRateLimit();

      const requestUrl = this.interpolate(runtime.archiveEndpoint.url, {
        url,
      });
      const requestBody = runtime.archiveEndpoint.bodyTemplate
        ? this.interpolate(runtime.archiveEndpoint.bodyTemplate, { url })
        : undefined;

      const headers = await this.buildHeaders(runtime.archiveEndpoint.headers);

      const response = await this.makeHttpRequest(requestUrl, {
        method: runtime.archiveEndpoint.method,
        headers,
        body: requestBody,
        timeout: runtime.archiveEndpoint.timeout,
      });

      this.updateLastRequest();

      if (!response.success) {
        // Map HTTP errors to ArchiveError types
        const errorType = this.mapHttpErrorToArchiveError(response.status);
        throw new ArchiveError(
          errorType,
          response.error || "Archive request failed",
          response.status,
        );
      }

      // 4. Parse response to extract archive URL
      const archivedUrl = this.parseResponse(
        response.data,
        runtime.responseParser,
      );

      if (!archivedUrl) {
        return {
          success: false,
          error: "Could not extract archive URL from service response",
        };
      }

      return {
        success: true,
        url: archivedUrl,
        metadata: {
          originalUrl: url,
          archiveDate: new Date().toISOString(),
          service: this.name,
        },
      };
    } catch (error) {
      if (error instanceof ArchiveError) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate URL against configured patterns
   */
  private validateUrl(url: string): { valid: boolean; error?: string } {
    const validator = this.config.runtime!.urlValidator!;

    if (validator.type === "regex") {
      try {
        const regex = new RegExp(validator.pattern);
        if (!regex.test(url)) {
          return {
            valid: false,
            error:
              validator.errorMessage ||
              `URL does not match required pattern for ${this.name}`,
          };
        }
      } catch (error) {
        return {
          valid: false,
          error: `Invalid regex pattern: ${validator.pattern}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if URL already has an archive
   */
  private async checkExisting(url: string): Promise<string | null> {
    const checkConfig = this.config.runtime!.checkEndpoint!;

    try {
      const requestUrl = this.interpolate(checkConfig.url, { url });
      const headers = await this.buildHeaders(checkConfig.headers);

      const response = await this.makeHttpRequest(requestUrl, {
        method: checkConfig.method,
        headers,
        timeout: 30000,
      });

      if (!response.success) {
        return null;
      }

      return this.parseResponse(response.data, checkConfig.parser);
    } catch {
      return null;
    }
  }

  /**
   * Parse response to extract archive URL
   */
  private parseResponse(data: string, parser: any): string | null {
    if (!data) {
      return null;
    }

    try {
      if (parser.type === "json") {
        const json = JSON.parse(data);
        const value = this.getNestedValue(json, parser.path || "");

        if (!value) {
          return null;
        }

        return parser.urlPrefix ? `${parser.urlPrefix}${value}` : String(value);
      }

      if (parser.type === "regex") {
        if (!parser.pattern) {
          return null;
        }

        const regex = new RegExp(parser.pattern);
        const match = data.match(regex);

        if (!match) {
          return null;
        }

        const captured =
          parser.captureGroup !== undefined
            ? match[parser.captureGroup]
            : match[0];

        if (!captured) {
          return null;
        }

        return parser.urlPrefix ? `${parser.urlPrefix}${captured}` : captured;
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Template string interpolation
   * Replaces {{url}} with encoded URL value
   */
  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = vars[key];
      return value ? encodeURIComponent(value) : "";
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) {
      return obj;
    }

    return path.split(".").reduce((current, key) => {
      if (current == null) {
        return undefined;
      }
      return current[key];
    }, obj);
  }

  /**
   * Build HTTP headers including authentication if configured
   */
  private async buildHeaders(
    baseHeaders?: Record<string, string>,
  ): Promise<Record<string, string>> {
    const headers = { ...baseHeaders };

    // Add authentication header if configured
    if (this.config.runtime?.auth?.type === "header") {
      const auth = this.config.runtime.auth;
      const credManager = CredentialManager.getInstance();

      try {
        const credential = await credManager.get(auth.credentialKey);

        if (credential) {
          const headerValue = auth.template
            ? auth.template.replace("{{credential}}", credential)
            : credential;
          headers[auth.headerName] = headerValue;
        }
      } catch {
        // Credential not available, continue without auth
      }
    }

    return headers;
  }

  /**
   * Map HTTP status code to ArchiveErrorType
   */
  private mapHttpErrorToArchiveError(status?: number): ArchiveErrorType {
    if (!status) {
      return ArchiveErrorType.Unknown;
    }

    if (status === 401 || status === 403) {
      return ArchiveErrorType.AuthRequired;
    }

    if (status === 429) {
      return ArchiveErrorType.RateLimit;
    }

    if (status === 404) {
      return ArchiveErrorType.NotFound;
    }

    if (status >= 500) {
      return ArchiveErrorType.ServerError;
    }

    if (status >= 400) {
      return ArchiveErrorType.Blocked;
    }

    return ArchiveErrorType.Unknown;
  }
}
