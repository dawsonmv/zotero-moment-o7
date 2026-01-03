import { PreferencesManager } from "../preferences/PreferencesManager";
import { ExtraFieldParser } from "./ExtraFieldParser";

declare const document: Document;

export interface RobustLinkData {
  originalUrl: string;
  archiveUrls: Record<string, string>;
  versionDate?: string;
  title?: string;
}

export class RobustLinkCreator {
  private static readonly DEFAULT_TEMPLATE = `
    <div class="robust-link-wrapper">
      <a href="{originalUrl}"
         data-originalurl="{originalUrl}"
         data-versionurl="{primaryArchiveUrl}"
         data-versiondate="{versionDate}"
         class="robust-link">
        {title}
      </a>
      <span class="robust-link-archives">
        [Archives: {archiveLinks}]
      </span>
    </div>
  `;

  /**
   * Creates a robust link HTML snippet with multiple archive sources
   */
  static create(data: RobustLinkData): string {
    const {
      originalUrl,
      archiveUrls,
      versionDate = new Date().toISOString(),
      title = originalUrl,
    } = data;

    // Get enabled services from preferences
    const enabledServices = PreferencesManager.getEnabledServices();

    // Filter archive URLs to only include enabled services
    const filteredArchiveUrls = Object.entries(archiveUrls)
      .filter(([service]) => enabledServices.includes(service))
      .reduce(
        (acc, [service, url]) => {
          acc[service] = url;
          return acc;
        },
        {} as Record<string, string>,
      );

    if (Object.keys(filteredArchiveUrls).length === 0) {
      // No archives available, return simple link
      return `<a href="${this.escapeHtml(originalUrl)}">${this.escapeHtml(title)}</a>`;
    }

    // Get the primary archive URL based on fallback order
    const primaryArchiveUrl = this.getPrimaryArchiveUrl(filteredArchiveUrls);

    // Create archive links
    const archiveLinks = this.createArchiveLinks(filteredArchiveUrls);

    // Replace template variables
    const html = RobustLinkCreator.DEFAULT_TEMPLATE.replace(
      /{originalUrl}/g,
      this.escapeHtml(originalUrl),
    )
      .replace(/{primaryArchiveUrl}/g, this.escapeHtml(primaryArchiveUrl))
      .replace(/{versionDate}/g, this.escapeHtml(versionDate))
      .replace(/{title}/g, this.escapeHtml(title))
      .replace(/{archiveLinks}/g, archiveLinks);

    return html.trim();
  }

  /**
   * Creates a simple robust link for notes
   */
  static createSimple(
    originalUrl: string,
    archiveUrl: string,
    service: string = "Unknown",
  ): string {
    const versionDate = new Date().toISOString();

    return `<a href="${this.escapeHtml(originalUrl)}"
       data-originalurl="${this.escapeHtml(originalUrl)}"
       data-versionurl="${this.escapeHtml(archiveUrl)}"
       data-versiondate="${this.escapeHtml(versionDate)}"
       title="Archived by ${this.escapeHtml(service)}">
      ${this.escapeHtml(originalUrl)}
    </a>
    [<a href="${this.escapeHtml(archiveUrl)}">Archived</a>]`;
  }

  /**
   * Parses robust link data from an HTML element
   */
  static parse(html: string): RobustLinkData | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const link = doc.querySelector("a[data-originalurl]");

      if (!link) {
        return null;
      }

      const originalUrl = link.getAttribute("data-originalurl") || "";
      const versionUrl = link.getAttribute("data-versionurl") || "";
      const versionDate = link.getAttribute("data-versiondate") || "";
      const title = link.textContent || originalUrl;

      // Extract archive URLs from the archives section
      const archiveUrls: Record<string, string> = {};
      const archiveLinks = doc.querySelectorAll(".robust-link-archives a");

      archiveLinks.forEach((archiveLink: Element) => {
        const href = archiveLink.getAttribute("href");
        const text = archiveLink.textContent || "";

        if (href && text) {
          // Try to determine service from link text or URL
          const service = this.detectService(href, text);
          if (service) {
            archiveUrls[service] = href;
          }
        }
      });

      // Add primary archive URL if not already included
      if (versionUrl && Object.keys(archiveUrls).length === 0) {
        const service = this.detectService(versionUrl, "");
        if (service) {
          archiveUrls[service] = versionUrl;
        }
      }

      return {
        originalUrl,
        archiveUrls,
        versionDate,
        title,
      };
    } catch (error) {
      Zotero.debug(`MomentO7: Failed to parse robust link: ${error}`);
      return null;
    }
  }

  /**
   * Create robust links for a Zotero item based on existing archives
   */
  static createFromItem(item: Zotero.Item): string | null {
    const url = item.getField("url");
    if (!url) return null;

    const title = item.getField("title") || url;

    // Extract archive URLs from Extra field using standardized parser
    const extra = item.getField("extra") || "";
    const archiveUrls = Object.fromEntries(
      ExtraFieldParser.extractAllArchives(extra),
    );

    if (Object.keys(archiveUrls).length === 0) {
      return null;
    }

    return this.create({
      originalUrl: url,
      archiveUrls,
      title,
    });
  }

  private static getPrimaryArchiveUrl(
    archiveUrls: Record<string, string>,
  ): string {
    const fallbackOrder = PreferencesManager.getFallbackOrder();

    // Find first available archive in fallback order
    for (const service of fallbackOrder) {
      if (archiveUrls[service]) {
        return archiveUrls[service];
      }
    }

    // If none found in order, return first available
    const firstUrl = Object.values(archiveUrls)[0];
    return firstUrl || "";
  }

  private static createArchiveLinks(
    archiveUrls: Record<string, string>,
  ): string {
    const serviceNames: Record<string, string> = {
      internetarchive: "IA",
      archivetoday: "AT",
      permacc: "Perma",
      ukwebarchive: "UK",
      arquivopt: "PT",
    };

    return Object.entries(archiveUrls)
      .map(([service, url]) => {
        const name = serviceNames[service] || service;
        return `<a href="${this.escapeHtml(url)}" title="${this.escapeHtml(service)}">${this.escapeHtml(name)}</a>`;
      })
      .join(", ");
  }

  private static detectService(url: string, text: string): string | null {
    const patterns: Record<string, RegExp[]> = {
      internetarchive: [/web\.archive\.org/i, /wayback/i],
      archivetoday: [/archive\.(today|is|ph|md|li)/i],
      permacc: [/perma\.cc/i],
      ukwebarchive: [/webarchive\.org\.uk/i],
      arquivopt: [/arquivo\.pt/i],
    };

    for (const [service, servicePatterns] of Object.entries(patterns)) {
      for (const pattern of servicePatterns) {
        if (pattern.test(url) || pattern.test(text)) {
          return service;
        }
      }
    }

    return null;
  }

  private static escapeHtml(text: string): string {
    const doc = document.implementation.createHTMLDocument("sandbox");
    const div = doc.createElement("div");
    div.textContent = text;
    return div.innerHTML as string;
  }
}
