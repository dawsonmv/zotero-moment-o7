import { BasicTool } from "zotero-plugin-toolkit";
import Addon from "./addon";
import { config } from "../package.json";

const basicTool = new BasicTool();

// Set up global unhandled promise rejection handler
// This catches promises that reject without a .catch() handler
if (typeof (globalThis as any).onunhandledrejection === "undefined") {
  (globalThis as any).onunhandledrejection = (event: PromiseRejectionEvent) => {
    const error = event.reason || "Unknown error";
    console.error(`[${config.addonName}] Unhandled promise rejection:`, error);
    // Don't prevent default - let Zotero's error handler also log it
  };
}

// @ts-expect-error - Plugin instance is not typed
if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  (globalThis as any).addon = new Addon();
  defineGlobal("ztoolkit", () => {
    return (globalThis as any).addon.data.ztoolkit;
  });
  // @ts-expect-error - Plugin instance is not typed
  Zotero[config.addonInstance] = (globalThis as any).addon;
}

function defineGlobal(name: Parameters<BasicTool["getGlobal"]>[0]): void;
function defineGlobal(name: string, getter: () => any): void;
function defineGlobal(name: string, getter?: () => any) {
  Object.defineProperty(globalThis, name, {
    get() {
      return getter ? getter() : basicTool.getGlobal(name);
    },
  });
}
