/**
 * Bootstrap loader for Zotero Moment-o7
 * This file loads the compiled TypeScript modules
 */
declare const ChromeUtils: any;
declare const Services: any;
declare let MomentO7: any;
declare function log(msg: string): void;
declare function install(): void;
declare function startup({ id, version, rootURI }: any): Promise<void>;
declare function shutdown(): void;
declare function uninstall(): void;
declare function onMainWindowLoad({ window }: {
    window: Window;
}): void;
declare function onMainWindowUnload({ window }: {
    window: Window;
}): void;
//# sourceMappingURL=bootstrap.d.ts.map