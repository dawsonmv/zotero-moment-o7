/**
 * Type augmentations for Zotero types
 * Extends zotero-types with additional signatures used by Zotero 7
 *
 * Note: We only augment the _ZoteroTypes namespace here to avoid
 * conflicts with test type declarations.
 */

// Augment the HTTP interface to support the 2-argument form of request()
// Zotero 7 supports: request(url, options) where method is in options
declare namespace _ZoteroTypes {
  interface HTTP {
    /**
     * HTTP request with URL and options (Zotero 7 form)
     * The method is specified in options.method (defaults to GET)
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

  // ProgressWindow instance interface
  interface ProgressWindowInstance {
    changeHeadline(text: string, icon?: string, url?: string): void;
    addLines(label: string, icon?: string): ItemProgress;
    addDescription(text: string): void;
    show(): void;
    close(): void;
    startCloseTimer(ms?: number): void;
  }

  // ItemProgress interface for progress window items
  interface ItemProgress {
    setProgress(progress: number): void;
    setIcon(icon: string): void;
    setText(text: string): void;
    setError(): void;
  }
}
