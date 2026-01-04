/**
 * Global type declarations for Moment-o7 plugin
 * These variables are injected by the build system and available globally
 */

import type { ZoteroToolkit } from "zotero-plugin-toolkit";
import type Addon from "../addon";

/**
 * Build environment: "development" or "production"
 * Injected by the build system via webpack DefinePlugin or similar
 */
declare const __env__: "development" | "production";

/**
 * Global addon instance
 * Created in src/index.ts and provides access to plugin lifecycle and data
 */
declare const addon: InstanceType<typeof Addon>;

/**
 * Global ZToolkit instance
 * Provides utilities for Zotero plugin development
 * This is a getter that returns addon.data.ztoolkit
 */
declare const ztoolkit: ZoteroToolkit;

/**
 * Extend the global namespace with addon types
 */
declare global {
  const __env__: "development" | "production";
  const addon: InstanceType<typeof Addon>;
  const ztoolkit: ZoteroToolkit;

  // Extend globalThis for runtime assignment
  var addon: InstanceType<typeof Addon>;
  var ztoolkit: ZoteroToolkit;
}

export {};
