/**
 * Utility class for parsing and writing archive metadata to/from Zotero item extra fields.
 *
 * Standardizes the format for storing archive URLs to ensure consistency between
 * writers (BaseArchiveService) and readers (RobustLinkCreator, MementoChecker).
 *
 * Format: `archive_{serviceId}: {url}`
 * Example: `archive_internetarchive: http://web.archive.org/web/20231201/...`
 */
export class ExtraFieldParser {
  private static readonly ARCHIVE_PREFIX = "archive_";
  private static readonly FIELD_SUFFIX = ":";

  /**
   * Extract archive URL for a specific service from extra field.
   * Supports both new format (archive_{serviceId}: {url}) and legacy formats.
   *
   * @param extra - The extra field content
   * @param serviceId - The service ID to search for
   * @returns The archive URL if found, null otherwise
   */
  static extractArchiveUrl(
    extra: string | null | undefined,
    serviceId: string,
  ): string | null {
    if (!extra || typeof extra !== "string") {
      return null;
    }

    // Try new format first: archive_{serviceId}: {url}
    const newFormatPattern = new RegExp(
      `^${this.ARCHIVE_PREFIX}${this.escapeRegex(serviceId)}${this.FIELD_SUFFIX}\\s*(.+)$`,
      "im",
    );
    const match = extra.match(newFormatPattern);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Fallback to legacy format for backward compatibility: {serviceId}Archived: {url}
    const legacyPattern = new RegExp(
      `^${this.escapeRegex(serviceId)}Archived${this.FIELD_SUFFIX}\\s*(.+)$`,
      "im",
    );
    const legacyMatch = extra.match(legacyPattern);
    if (legacyMatch && legacyMatch[1]) {
      return legacyMatch[1].trim();
    }

    return null;
  }

  /**
   * Extract all archive URLs from extra field, keyed by service ID.
   * Automatically detects both new and legacy formats.
   *
   * @param extra - The extra field content
   * @returns Map of service ID to archive URL
   */
  static extractAllArchives(
    extra: string | null | undefined,
  ): Map<string, string> {
    const archives = new Map<string, string>();

    if (!extra || typeof extra !== "string") {
      return archives;
    }

    const lines = extra.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Try new format: archive_{serviceId}: {url}
      const newFormatMatch = trimmedLine.match(
        new RegExp(
          `^${this.ARCHIVE_PREFIX}([a-z0-9]+)${this.FIELD_SUFFIX}\\s*(.+)$`,
        ),
      );
      if (newFormatMatch && newFormatMatch[2]) {
        const serviceId = newFormatMatch[1];
        const url = newFormatMatch[2].trim();
        archives.set(serviceId, url);
        continue;
      }

      // Try legacy format: {serviceId}Archived: {url}
      const legacyMatch = trimmedLine.match(/^([a-z0-9]+)Archived:\s*(.+)$/);
      if (legacyMatch && legacyMatch[2]) {
        const serviceId = legacyMatch[1];
        const url = legacyMatch[2].trim();
        // Only set if not already present (new format takes precedence)
        if (!archives.has(serviceId)) {
          archives.set(serviceId, url);
        }
      }
    }

    return archives;
  }

  /**
   * Write an archive URL to the extra field in standardized format.
   * Appends to existing content without duplicating entries.
   *
   * @param extra - The current extra field content
   * @param serviceId - The service ID
   * @param url - The archive URL to write
   * @returns Updated extra field content
   */
  static writeArchiveUrl(
    extra: string | null | undefined,
    serviceId: string,
    url: string,
  ): string {
    const currentExtra = extra && typeof extra === "string" ? extra : "";

    // Check if entry already exists (either format)
    const existingUrl = this.extractArchiveUrl(currentExtra, serviceId);
    if (existingUrl === url) {
      // Exact duplicate, return as-is
      return currentExtra;
    }

    // Remove any existing entries for this service (both formats)
    const cleanedExtra = this.removeArchiveUrl(currentExtra, serviceId);

    // Append new entry in standardized format
    const newEntry = `${this.ARCHIVE_PREFIX}${serviceId}${this.FIELD_SUFFIX} ${url}`;
    return cleanedExtra ? cleanedExtra + "\n" + newEntry : newEntry;
  }

  /**
   * Remove archive URL for a specific service from extra field.
   *
   * @param extra - The extra field content
   * @param serviceId - The service ID to remove
   * @returns Updated extra field content
   */
  static removeArchiveUrl(
    extra: string | null | undefined,
    serviceId: string,
  ): string {
    if (!extra || typeof extra !== "string") {
      return "";
    }

    const lines = extra.split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      // Remove new format: archive_{serviceId}: ...
      if (
        trimmed.startsWith(
          `${this.ARCHIVE_PREFIX}${serviceId}${this.FIELD_SUFFIX}`,
        )
      ) {
        return false;
      }
      // Remove legacy format: {serviceId}Archived: ...
      if (trimmed.startsWith(`${serviceId}Archived${this.FIELD_SUFFIX}`)) {
        return false;
      }
      return true;
    });

    return filtered
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0)
      .join("\n");
  }

  /**
   * Check if an archive URL exists for a specific service.
   *
   * @param extra - The extra field content
   * @param serviceId - The service ID to check
   * @returns True if an archive URL exists for this service
   */
  static hasArchive(
    extra: string | null | undefined,
    serviceId: string,
  ): boolean {
    return this.extractArchiveUrl(extra, serviceId) !== null;
  }

  /**
   * Escape special regex characters in a string.
   *
   * @param str - The string to escape
   * @returns Escaped string safe for use in regex
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
