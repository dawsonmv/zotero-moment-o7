/**
 * Bootstrap loader for Zotero Moment-o7
 * This file loads the compiled TypeScript modules
 */

/// <reference path="./src/types/zotero.d.ts" />

declare const ChromeUtils: any;
declare const Services: any;

// Import the main plugin
let MomentO7: any;

function log(msg: string): void {
  Zotero.debug(`[Moment-o7 Bootstrap] ${msg}`);
}

function install(): void {
  log('Install called');
}

async function startup({ id, version, rootURI }: any): Promise<void> {
  log(`Starting Moment-o7 version ${version}`);
  
  // Wait for Zotero to be ready
  await Zotero.initializationPromise;

  try {
    // Load the compiled JavaScript
    Services.scriptloader.loadSubScript(rootURI + 'build/MomentO7.js');
    
    // Initialize the plugin
    if (Zotero.MomentO7) {
      Zotero.MomentO7.init({ id, version, rootURI });
      
      // Add to all windows
      Zotero.MomentO7.addToAllWindows();
      
      // Run main initialization
      await Zotero.MomentO7.main();
    } else {
      throw new Error('Failed to load MomentO7 module');
    }
  } catch (error) {
    log(`Startup error: ${error}`);
    throw error;
  }
}

function shutdown(): void {
  log('Shutting down Moment-o7');
  
  try {
    if (Zotero.MomentO7) {
      // Remove from all windows
      Zotero.MomentO7.removeFromAllWindows();
      
      // Shutdown the plugin
      Zotero.MomentO7.shutdown();
      
      // Clear the global reference
      delete Zotero.MomentO7;
    }
  } catch (error) {
    log(`Shutdown error: ${error}`);
  }
}

function uninstall(): void {
  log('Uninstall called');
}

// Handle window load/unload
function onMainWindowLoad({ window }: { window: Window }): void {
  try {
    if (Zotero.MomentO7) {
      Zotero.MomentO7.addToWindow(window);
    }
  } catch (error) {
    log(`Window load error: ${error}`);
  }
}

function onMainWindowUnload({ window }: { window: Window }): void {
  try {
    if (Zotero.MomentO7) {
      Zotero.MomentO7.removeFromWindow(window);
    }
  } catch (error) {
    log(`Window unload error: ${error}`);
  }
}