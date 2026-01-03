import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";

// Domain logic imports
import { ServiceConfigLoader } from "./modules/archive/ServiceConfigLoader";
import { ArchiveCoordinator } from "./modules/archive/ArchiveCoordinator";
import { MementoChecker } from "./modules/memento/MementoChecker";
import { RobustLinkCreator } from "./modules/archive/RobustLinkCreator";
import { PreferencesManager } from "./modules/preferences/PreferencesManager";
import { ZoteroItemHandler } from "./modules/archive/ZoteroItemHandler";

/**
 * Called when the plugin starts up
 * Initialize services, register notifiers, set up menus
 */
async function onStartup() {
  try {
    await Promise.all([
      Zotero.initializationPromise,
      Zotero.unlockPromise,
      Zotero.uiReadyPromise,
    ]);
  } catch (error) {
    Zotero.debug(
      `[Moment-o7] Zotero initialization promise failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Continue startup anyway - some promises may have already resolved
  }

  // Initialize localization
  initLocale();

  // Initialize preferences
  await PreferencesManager.getInstance().init();

  // Initialize archive services
  initializeServices();

  // Register preferences observer
  registerPrefsObserver();

  // Register item notifier for auto-archiving
  registerNotifier();

  // Initialize all main windows
  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Mark as initialized
  addon.data.initialized = true;
  addon.data.momento7.servicesInitialized = true;
  ztoolkit.log("Moment-o7 initialized successfully");
}

/**
 * Initialize archive services in the registry
 */
function initializeServices(): void {
  ServiceConfigLoader.loadAllServices();
  ztoolkit.log("Archive services registered");
}

/**
 * Called when a main window loads
 */
async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for this window
  addon.data.ztoolkit = createZToolkit();

  // Insert FTL localization file
  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  // Register menu items
  registerMenuItems(win);

  // Show startup notification
  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: 3000,
  })
    .createLine({
      text: getString("startup-ready") || "Moment-o7 ready",
      type: "success",
    })
    .show();
}

/**
 * Called when a main window unloads
 */
async function onMainWindowUnload(_win: Window): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

/**
 * Called when the plugin shuts down
 */
function onShutdown(): void {
  // Unregister notifier
  if (addon.data.momento7.notifierId) {
    Zotero.Notifier.unregisterObserver(addon.data.momento7.notifierId);
  }

  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();

  // Clean up
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * Register item notifier for auto-archiving new items
 */
function registerNotifier(): void {
  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: (string | number)[],
      _extraData: Record<string, unknown>,
    ) => {
      if (!addon?.data?.alive) return;
      try {
        await onNotify(event, type, ids, _extraData);
      } catch (error) {
        ztoolkit.log(`Notifier error: ${error}`, "error");
      }
    },
  };

  addon.data.momento7.notifierId = Zotero.Notifier.registerObserver(callback, [
    "item",
  ]);
}

/**
 * Register preferences observer
 */
function registerPrefsObserver(): void {
  // Preferences will be observed via Zotero.Prefs
  ztoolkit.log("Preferences observer registered");
}

/**
 * Register menu items in the Zotero UI
 */
function registerMenuItems(_win: _ZoteroTypes.MainWindow): void {
  // Helper to wrap async menu handlers with error handling
  const safeAsyncCommand = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (error) {
      ztoolkit.log(`Menu command error: ${error}`, "error");
      showNotification("fail", `Error: ${error}`);
    }
  };

  // Right-click context menu for items
  ztoolkit.Menu.register("item", {
    tag: "menu",
    label: getString("menu-archive") || "Archive",
    id: `${addon.data.config.addonRef}-item-menu`,
    children: [
      {
        tag: "menuitem",
        label: getString("menu-archive-selected") || "Archive Selected Items",
        commandListener: safeAsyncCommand(onArchiveSelected),
      },
      {
        tag: "menuitem",
        label:
          getString("menu-check-mementos") || "Check for Existing Archives",
        commandListener: safeAsyncCommand(onCheckMementos),
      },
      {
        tag: "menuseparator",
      },
      // Individual service menu items
      {
        tag: "menu",
        label: "Archive to...",
        children: [
          {
            tag: "menuitem",
            label: "Internet Archive",
            commandListener: safeAsyncCommand(() =>
              onArchiveToService("internetarchive"),
            ),
          },
          {
            tag: "menuitem",
            label: "Archive.today",
            commandListener: safeAsyncCommand(() =>
              onArchiveToService("archivetoday"),
            ),
          },
          {
            tag: "menuitem",
            label: "Perma.cc",
            commandListener: safeAsyncCommand(() =>
              onArchiveToService("permacc"),
            ),
          },
          {
            tag: "menuitem",
            label: "UK Web Archive",
            commandListener: safeAsyncCommand(() =>
              onArchiveToService("ukwebarchive"),
            ),
          },
          {
            tag: "menuitem",
            label: "Arquivo.pt",
            commandListener: safeAsyncCommand(() =>
              onArchiveToService("arquivopt"),
            ),
          },
        ],
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: getString("menu-create-robust-links") || "Create Robust Links",
        commandListener: safeAsyncCommand(onCreateRobustLinks),
      },
    ],
  });

  // Tools menu
  ztoolkit.Menu.register("menuTools", {
    tag: "menu",
    label: getString("menu-momento7") || "Moment-o7",
    id: `${addon.data.config.addonRef}-tools-menu`,
    children: [
      {
        tag: "menuitem",
        label: getString("menu-archive-all") || "Archive All Items with URLs",
        commandListener: safeAsyncCommand(onArchiveAll),
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: getString("menu-preferences") || "Preferences...",
        commandListener: () => {
          try {
            // Open Zotero preferences to the Moment-o7 pane
            (Zotero as any).Utilities.Internal.openPreferences(
              addon.data.config.addonRef,
            );
          } catch (error) {
            ztoolkit.log(`Preferences error: ${error}`, "error");
          }
        },
      },
    ],
  });
}

/**
 * Archive selected items to a specific service
 */
async function onArchiveToService(serviceId: string): Promise<void> {
  const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
  if (items.length === 0) {
    showNotification("warning", "No items selected");
    return;
  }

  const archivableItems = items.filter((item: Zotero.Item) =>
    ZoteroItemHandler.needsArchiving(item),
  );

  if (archivableItems.length === 0) {
    showNotification("info", "All selected items are already archived");
    return;
  }

  const serviceNames: Record<string, string> = {
    internetarchive: "Internet Archive",
    archivetoday: "Archive.today",
    permacc: "Perma.cc",
    ukwebarchive: "UK Web Archive",
    arquivopt: "Arquivo.pt",
  };

  const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: false,
  });
  progressWin.createLine({
    text: `Archiving ${archivableItems.length} items to ${serviceNames[serviceId] || serviceId}...`,
    type: "default",
    progress: 0,
  });
  progressWin.show();

  try {
    const coordinator = ArchiveCoordinator.getInstance();
    const results = await coordinator.archiveItems(archivableItems, serviceId);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    progressWin.changeLine({
      text: `${serviceNames[serviceId]}: ${successCount} succeeded, ${failCount} failed`,
      type: successCount > 0 ? "success" : "fail",
      progress: 100,
    });
    progressWin.startCloseTimer(5000);
  } catch (error) {
    progressWin.changeLine({
      text: `Archive failed: ${error}`,
      type: "fail",
      progress: 100,
    });
    progressWin.startCloseTimer(5000);
  }
}

/**
 * Handle Zotero notifier events
 */
async function onNotify(
  event: string,
  type: string,
  ids: (string | number)[],
  _extraData: Record<string, unknown>,
): Promise<void> {
  if (type !== "item") return;

  if (event === "add") {
    // Auto-archive new items if enabled
    if (PreferencesManager.isAutoArchiveEnabled()) {
      const items = ids
        .map((id) => Zotero.Items.get(id as number))
        .filter((item): item is Zotero.Item => item != null);

      // Filter to only items that need archiving
      const archivableItems = items.filter((item) =>
        ZoteroItemHandler.needsArchiving(item),
      );

      if (archivableItems.length > 0) {
        ztoolkit.log(`Auto-archiving ${archivableItems.length} new items`);
        const coordinator = ArchiveCoordinator.getInstance();

        for (const item of archivableItems) {
          try {
            await coordinator.autoArchive(item);
          } catch (error) {
            ztoolkit.log(`Auto-archive failed for item ${item.id}: ${error}`);
          }
        }
      }
    }
  }
}

/**
 * Handle preferences events
 */
async function onPrefsEvent(
  type: string,
  data: { [key: string]: unknown },
): Promise<void> {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window as Window);
      break;
    default:
      return;
  }
}

/**
 * Archive selected items
 */
async function onArchiveSelected(): Promise<void> {
  const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
  if (items.length === 0) {
    showNotification("warning", "No items selected");
    return;
  }

  // Filter to archivable items
  const archivableItems = items.filter((item: Zotero.Item) =>
    ZoteroItemHandler.needsArchiving(item),
  );

  if (archivableItems.length === 0) {
    showNotification("info", "All selected items are already archived");
    return;
  }

  ztoolkit.log(`Archiving ${archivableItems.length} selected items`);

  const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: false,
  });
  progressWin.createLine({
    text: `Archiving ${archivableItems.length} items...`,
    type: "default",
    progress: 0,
  });
  progressWin.show();

  try {
    const coordinator = ArchiveCoordinator.getInstance();
    const results = await coordinator.archiveItems(archivableItems);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    progressWin.changeLine({
      text: `Archived: ${successCount} succeeded, ${failCount} failed`,
      type: successCount > 0 ? "success" : "fail",
      progress: 100,
    });
    progressWin.startCloseTimer(5000);
  } catch (error) {
    progressWin.changeLine({
      text: `Archive failed: ${error}`,
      type: "fail",
      progress: 100,
    });
    progressWin.startCloseTimer(5000);
    ztoolkit.log(`Archive error: ${error}`);
  }
}

/**
 * Check for existing mementos
 */
async function onCheckMementos(): Promise<void> {
  const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
  if (items.length === 0) {
    showNotification("warning", "No items selected");
    return;
  }

  const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: false,
  });
  progressWin.createLine({
    text: `Checking ${items.length} items for existing archives...`,
    type: "default",
    progress: 0,
  });
  progressWin.show();

  let foundCount = 0;
  let checkedCount = 0;

  for (const item of items) {
    const urlField = item.getField("url");
    const url = typeof urlField === "string" ? urlField : "";
    if (!url) {
      checkedCount++;
      continue;
    }

    try {
      const result = await MementoChecker.checkUrl(url);
      if (result.hasMemento) {
        foundCount++;
        ztoolkit.log(`Found ${result.mementos.length} mementos for ${url}`);
      }
    } catch (error) {
      ztoolkit.log(`Memento check failed for ${url}: ${error}`);
    }

    checkedCount++;
    progressWin.changeLine({
      text: `Checked ${checkedCount}/${items.length} items, found ${foundCount} with archives`,
      progress: Math.round((checkedCount / items.length) * 100),
    });
  }

  progressWin.changeLine({
    text: `Found ${foundCount} items with existing archives`,
    type: foundCount > 0 ? "success" : "info",
    progress: 100,
  });
  progressWin.startCloseTimer(5000);
}

/**
 * Create robust links for selected items
 */
async function onCreateRobustLinks(): Promise<void> {
  const items = Zotero.getActiveZoteroPane()?.getSelectedItems() || [];
  if (items.length === 0) {
    showNotification("warning", "No items selected");
    return;
  }

  let createdCount = 0;
  let skippedCount = 0;
  let lastRobustLink = "";

  for (const item of items) {
    const robustLink = RobustLinkCreator.createFromItem(item);
    if (robustLink) {
      lastRobustLink = robustLink;
      createdCount++;
      ztoolkit.log(`Created robust link for item ${item.id}`);
    } else {
      skippedCount++;
    }
  }

  if (createdCount > 0) {
    // Copy to clipboard using Zotero's utility
    if (lastRobustLink) {
      new ztoolkit.Clipboard().addText(lastRobustLink, "text/html").copy();
    }
    showNotification(
      "success",
      `Created robust link${createdCount > 1 ? "s" : ""} for ${createdCount} item${createdCount > 1 ? "s" : ""} (copied to clipboard)`,
    );
  } else {
    showNotification(
      "warning",
      "No items have archived URLs. Archive items first.",
    );
  }
}

/**
 * Archive all items with URLs
 */
async function onArchiveAll(): Promise<void> {
  ztoolkit.log("Archive all items requested");

  // Get all library items using Search API
  const libraryID = Zotero.Libraries.userLibraryID;
  const search = new (Zotero as any).Search();
  search.libraryID = libraryID;
  search.addCondition("itemType", "isNot", "attachment");
  search.addCondition("itemType", "isNot", "note");
  const itemIDs = await search.search();
  const allItems = await Zotero.Items.getAsync(itemIDs);

  // Filter to archivable items
  const archivableItems = allItems.filter((item: Zotero.Item) =>
    ZoteroItemHandler.needsArchiving(item),
  );

  if (archivableItems.length === 0) {
    showNotification("info", "All items are already archived");
    return;
  }

  // Confirm with user - use Zotero's prompt utility
  const win = Zotero.getMainWindow();
  if (!win) return;

  const confirmed = win.confirm(
    `This will archive ${archivableItems.length} items. This may take a while. Continue?`,
  );

  if (!confirmed) {
    return;
  }

  const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: false,
  });
  progressWin.createLine({
    text: `Archiving ${archivableItems.length} items...`,
    type: "default",
    progress: 0,
  });
  progressWin.show();

  const coordinator = ArchiveCoordinator.getInstance();
  let successCount = 0;
  let failCount = 0;
  let processedCount = 0;

  for (const item of archivableItems) {
    try {
      const result = await coordinator.autoArchive(item);
      if (result?.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
      ztoolkit.log(`Archive failed for item ${item.id}: ${error}`);
    }

    processedCount++;
    progressWin.changeLine({
      text: `Processed ${processedCount}/${archivableItems.length}: ${successCount} succeeded, ${failCount} failed`,
      progress: Math.round((processedCount / archivableItems.length) * 100),
    });

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  progressWin.changeLine({
    text: `Complete: ${successCount} archived, ${failCount} failed`,
    type: successCount > 0 ? "success" : "fail",
    progress: 100,
  });
  progressWin.startCloseTimer(5000);
}

/**
 * Show a notification to the user
 */
function showNotification(
  type: "success" | "warning" | "info" | "fail",
  message: string,
): void {
  const progressWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: 3000,
  });
  progressWin.createLine({
    text: message,
    type,
  });
  progressWin.show();
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
};
