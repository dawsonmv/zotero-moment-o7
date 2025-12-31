import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";

/**
 * Moment-o7 Addon class
 * Manages plugin lifecycle, data, and provides APIs for archiving services
 */
class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
    // Moment-o7 specific data
    momento7: {
      servicesInitialized: boolean;
      notifierId?: string;
    };
  };

  // Lifecycle hooks
  public hooks: typeof hooks;

  // Public APIs for external access
  public api: {
    archiveSelected?: () => Promise<void>;
    checkMementos?: () => Promise<void>;
    createRobustLinks?: () => Promise<void>;
  };

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
      momento7: {
        servicesInitialized: false,
      },
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
