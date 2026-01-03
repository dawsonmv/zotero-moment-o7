/**
 * Augmentations to zotero-types for Zotero 7 APIs
 *
 * This file extends the _ZoteroTypes namespace with APIs that exist in Zotero 7
 * but are not yet in the zotero-types package (v4.1.0-beta.4).
 *
 * These augmentations are not duplications - they represent genuine missing APIs
 * in the upstream zotero-types package.
 */

declare namespace _ZoteroTypes {
  interface HTTP {
    /**
     * HTTP request with URL and options (Zotero 7 form)
     * The method is specified in options.method (defaults to GET)
     *
     * This is the modern form of Zotero.HTTP.request() and is preferred over the
     * 3-argument form for new code. The options object provides better type safety
     * and clearer intent.
     *
     * @param url - The URL to request
     * @param options - Request options (method, headers, body, timeout, etc.)
     * @returns Promise that resolves to XMLHttpRequest response
     *
     * @example
     * ```typescript
     * const response = await Zotero.HTTP.request(url, {
     *   method: "POST",
     *   headers: { "Content-Type": "application/json" },
     *   body: JSON.stringify(data),
     *   timeout: 60000
     * });
     * ```
     *
     * @see https://github.com/zotero/zotero/blob/master/chrome/content/zotero/xpcom/http.js
     */
    request(
      url: string,
      options?: {
        method?: string;
        body?: string | Uint8Array;
        headers?: Record<string, string>;
        followRedirects?: boolean;
        cookieSandbox?: Zotero.CookieSandbox;
        debug?: boolean;
        noCache?: boolean;
        dontCache?: boolean;
        foreground?: boolean;
        logBodyLength?: number;
        requestObserver?: Function;
        cancellerReceiver?: Function;
        responseType?: string;
        responseCharset?: string;
        successCodes?: number[] | false;
        timeout?: number;
        errorDelayIntervals?: number[];
        errorDelayMax?: number;
      },
    ): Promise<XMLHttpRequest>;
  }
}
