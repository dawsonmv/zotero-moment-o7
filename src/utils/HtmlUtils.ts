/**
 * HTML utility functions
 * Separates HTML processing concerns from business logic
 *
 * Security notes:
 * - Uses isolated documents (via createHTMLDocument) for parsing untrusted HTML
 * - Scripts never execute in isolated documents
 * - All parsing happens in sandboxed context
 */

// Declare document for browser context
declare const document: Document;

export class HtmlUtils {
  /**
   * Create an isolated document for safe HTML parsing.
   * The returned document is sandboxed - scripts won't execute.
   */
  private static createIsolatedDocument(html: string): Document {
    // Create sandboxed document - scripts won't execute in this context
    const doc = document.implementation.createHTMLDocument("sandbox");
    if (doc.body) {
      doc.body.innerHTML = html;
    }
    return doc;
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  static escape(text: string): string {
    if (!text) return "";

    const escapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
      "/": "&#x2F;",
    };

    return text.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }

  /**
   * Unescape HTML entities safely.
   * Uses isolated document for decoding - scripts won't execute.
   */
  static unescape(text: string): string {
    if (!text) return "";

    // Use isolated textarea for safe entity decoding
    // Textarea doesn't render HTML, just decodes entities
    const doc = document.implementation.createHTMLDocument("sandbox");
    const textarea = doc.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  /**
   * Strip HTML tags from text safely using isolated document.
   */
  static stripTags(html: string): string {
    if (!html) return "";

    const doc = this.createIsolatedDocument(html);
    return doc.body?.textContent || doc.body?.innerText || "";
  }

  /**
   * Create a safe HTML element from text
   */
  static createSafeElement(
    tag: string,
    text: string,
    attributes?: Record<string, string>,
  ): string {
    const escapedText = this.escape(text);
    const attrStr = attributes
      ? Object.entries(attributes)
          .map(([key, value]) => `${key}="${this.escape(value)}"`)
          .join(" ")
      : "";

    return `<${tag}${attrStr ? " " + attrStr : ""}>${escapedText}</${tag}>`;
  }

  /**
   * Create a robust link with data attributes
   */
  static createRobustLink(
    originalUrl: string,
    archivedUrl: string,
    linkText: string,
    versionDate: string = new Date().toISOString(),
  ): string {
    return this.createSafeElement("a", linkText, {
      href: originalUrl,
      "data-originalurl": originalUrl,
      "data-versionurl": archivedUrl,
      "data-versiondate": versionDate,
    });
  }

  /**
   * Parse attributes from an HTML string safely using isolated document.
   */
  static parseAttributes(html: string): Record<string, string> {
    const doc = this.createIsolatedDocument(html);

    const element = doc.body?.firstElementChild;
    if (!element) return {};

    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    return attributes;
  }

  /**
   * Extract URLs from HTML content safely using isolated document.
   */
  static extractUrls(html: string): string[] {
    const doc = this.createIsolatedDocument(html);
    const body = doc.body;
    if (!body) return [];

    const urls = new Set<string>();

    // Extract from href attributes
    body.querySelectorAll("[href]").forEach((element: Element) => {
      const href = element.getAttribute("href");
      if (href && href.startsWith("http")) {
        urls.add(href);
      }
    });

    // Extract from src attributes
    body.querySelectorAll("[src]").forEach((element: Element) => {
      const src = element.getAttribute("src");
      if (src && src.startsWith("http")) {
        urls.add(src);
      }
    });

    return Array.from(urls);
  }

  /**
   * Sanitize HTML to remove potentially dangerous elements.
   * Uses isolated document for safe parsing - scripts won't execute.
   */
  static sanitize(
    html: string,
    allowedTags: string[] = ["p", "a", "span", "div", "pre"],
  ): string {
    const doc = this.createIsolatedDocument(html);
    const body = doc.body;
    if (!body) return "";

    // Remove script tags and event handlers
    body
      .querySelectorAll("script, style")
      .forEach((el: Element) => el.remove());
    body.querySelectorAll("*").forEach((el: Element) => {
      // Remove event handlers
      Array.from(el.attributes).forEach((attr: Attr) => {
        if (attr.name.startsWith("on")) {
          el.removeAttribute(attr.name);
        }
      });

      // Remove disallowed tags
      if (!allowedTags.includes(el.tagName.toLowerCase())) {
        // Collect child nodes as an array for replaceWith
        const children: Node[] = [];
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child) {
            children.push(child);
          }
        }
        if (children.length > 0) {
          el.replaceWith(...children);
        } else {
          el.remove();
        }
      }
    });

    return body.innerHTML as string;
  }
}
