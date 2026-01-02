/**
 * Concurrent Archive Queue - Processes up to 4 items simultaneously
 *
 * Uses Promise.race() pattern to manage concurrency:
 * - Starts up to 4 items in parallel
 * - When one completes, immediately starts the next queued item
 * - Maintains per-item progress in ProgressWindow
 * - Updates headline with completion progress and traffic summary
 *
 * Example flow:
 *   Item 1 [0-15s] → Item 5 [15-20s]
 *   Item 2 [0-8s]  → Item 6 [8-12s]  (both complete before Item 3)
 *   Item 3 [0-22s]
 *   Item 4 [0-18s] → Item 7 [18-25s]
 */

import { ArchiveResult } from "../modules/archive/types";
import { TrafficMonitor } from "./TrafficMonitor";

interface ItemProgress {
  item: Zotero.Item;
  status: "queued" | "processing" | "completed" | "failed";
  lineHandle: any;
  result?: ArchiveResult;
  error?: string;
}

interface ActivePromiseEntry {
  promise: Promise<ArchiveResult>;
  id: string;
}

export class ConcurrentArchiveQueue {
  private maxConcurrency: number;
  private trafficMonitor: TrafficMonitor;
  private progressWindow: any; // InstanceType<typeof Zotero.ProgressWindow>
  private itemProgress: Map<string, ItemProgress> = new Map();
  private activeCount: number = 0;

  /**
   * Convert item ID to string key (items may have numeric IDs)
   */
  private getItemKey(item: Zotero.Item): string {
    return String(item.id);
  }

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = Math.min(Math.max(1, maxConcurrency), 8); // Clamp 1-8
    this.trafficMonitor = TrafficMonitor.getInstance();
  }

  /**
   * Process items with concurrent queue pattern
   * @param items Items to archive
   * @param archiveFn Function to archive a single item: (item) => Promise<ArchiveResult>
   * @returns Results in original item order
   */
  async process(
    items: Zotero.Item[],
    archiveFn: (item: Zotero.Item) => Promise<ArchiveResult>,
  ): Promise<ArchiveResult[]> {
    if (!items || items.length === 0) {
      return [];
    }

    // Reset traffic monitor for new batch
    this.trafficMonitor.resetBatch();

    // Initialize progress tracking for all items
    this.initializeProgressTracking(items);

    // Create progress window
    this.createProgressWindow(items.length);

    const queue = [...items];
    const activePromises: ActivePromiseEntry[] = [];
    const completedResults: Map<string, ArchiveResult> = new Map();

    try {
      // Initial batch: start up to maxConcurrency items
      while (this.activeCount < this.maxConcurrency && queue.length > 0) {
        const item = queue.shift()!;
        const promise = this.processItem(item, archiveFn);
        const id = this.getItemKey(item);
        activePromises.push({ promise, id });
        this.activeCount++;
      }

      // Process remaining items as earlier ones complete
      while (queue.length > 0 || activePromises.length > 0) {
        if (activePromises.length === 0) break;

        // Wait for next item to complete using Promise.race
        const result = await Promise.race(
          activePromises.map((entry) => entry.promise),
        );
        const completedId = this.getItemKey(result.item);
        completedResults.set(completedId, result);

        // Remove completed promise from active array by matching result's item ID
        const completedIndex = activePromises.findIndex(
          (entry) => entry.id === completedId,
        );
        if (completedIndex >= 0) {
          activePromises.splice(completedIndex, 1);
        }
        this.activeCount--;

        // Start next queued item
        if (queue.length > 0) {
          const nextItem = queue.shift()!;
          const nextPromise = this.processItem(nextItem, archiveFn);
          const nextId = this.getItemKey(nextItem);
          activePromises.push({ promise: nextPromise, id: nextId });
          this.activeCount++;
        }

        // Update headline with progress
        const completedCount = completedResults.size;
        this.updateHeadline(completedCount, items.length);
      }

      // Close progress window
      this.closeProgressWindow(completedResults.size, items.length);

      // Return results in original item order
      return items.map((item) => completedResults.get(this.getItemKey(item)) || {
        item,
        success: false,
        error: "Item was not processed",
      });
    } catch (error) {
      Zotero.debug(
        `MomentO7 Queue: Error during processing: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Process a single item and update its progress line
   */
  private async processItem(
    item: Zotero.Item,
    archiveFn: (item: Zotero.Item) => Promise<ArchiveResult>,
  ): Promise<ArchiveResult> {
    const itemKey = this.getItemKey(item);
    const itemProgress = this.itemProgress.get(itemKey);

    if (!itemProgress) {
      throw new Error(`Item ${itemKey} not found in progress tracking`);
    }

    // Update status to processing
    itemProgress.status = "processing";
    this.updateItemLine(itemProgress, "Processing...");

    try {
      const result = await archiveFn(item);

      // Update status to completed
      itemProgress.status = "completed";
      itemProgress.result = result;

      // Update progress line with result
      if (result.success) {
        const url = result.archivedUrl || "Unknown";
        this.updateItemLine(
          itemProgress,
          `✓ Archived: ${url.substring(0, 50)}...`,
          "success",
        );
      } else {
        const error = result.error || "Unknown error";
        this.updateItemLine(
          itemProgress,
          `✗ Failed: ${error.substring(0, 50)}...`,
          "fail",
        );
      }

      return result;
    } catch (error) {
      // Update status to failed
      itemProgress.status = "failed";
      const errorMessage = error instanceof Error ? error.message : String(error);
      itemProgress.error = errorMessage;

      this.updateItemLine(
        itemProgress,
        `✗ Error: ${errorMessage.substring(0, 50)}...`,
        "fail",
      );

      return {
        item,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create progress window with multi-line support
   */
  private createProgressWindow(itemCount: number): void {
    this.progressWindow = new (Zotero.ProgressWindow as any)({
      closeOnClick: false,
    });

    this.progressWindow.changeHeadline(
      `Archiving (0/${itemCount}) | Loading...`,
    );

    // Create progress lines for each item
    for (const [, itemProgress] of this.itemProgress) {
      const itemTitle = itemProgress.item.getField("title") || "Untitled";
      const truncatedTitle = itemTitle.substring(0, 50);
      itemProgress.lineHandle = this.progressWindow.addDescription(
        `⏳ ${truncatedTitle}`,
      );
    }

    this.progressWindow.show();
  }

  /**
   * Update a single item's progress line
   */
  private updateItemLine(
    itemProgress: ItemProgress,
    message: string,
    type: "default" | "success" | "fail" = "default",
  ): void {
    if (!this.progressWindow || !itemProgress.lineHandle) {
      return;
    }

    const itemTitle = itemProgress.item.getField("title") || "Untitled";
    const icon =
      type === "success" ? "✓" : type === "fail" ? "✗" : "⏳";
    const prefix = icon;

    this.progressWindow.addDescription(
      `${prefix} ${itemTitle.substring(0, 40)}: ${message}`,
    );
  }

  /**
   * Update headline with progress and traffic summary
   */
  private updateHeadline(
    completedCount: number,
    totalCount: number,
  ): void {
    if (!this.progressWindow) {
      return;
    }

    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const trafficSummary = this.trafficMonitor.getTrafficSummary();

    let headline = `Archiving (${completedCount}/${totalCount} - ${percentage}%)`;
    if (trafficSummary !== "No traffic data") {
      headline += ` | ${trafficSummary}`;
    }

    this.progressWindow.changeHeadline(headline);
  }

  /**
   * Close progress window with summary
   */
  private closeProgressWindow(
    completedCount: number,
    totalCount: number,
  ): void {
    if (!this.progressWindow) {
      return;
    }

    const successCount = Array.from(this.itemProgress.values()).filter(
      (p) => p.result?.success,
    ).length;
    const failCount = completedCount - successCount;
    const percentage = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    this.progressWindow.changeHeadline(
      `Complete: ${successCount} archived, ${failCount} failed (${percentage}%)`,
    );

    this.progressWindow.startCloseTimer(5000);
  }

  /**
   * Initialize progress tracking for items
   */
  private initializeProgressTracking(items: Zotero.Item[]): void {
    this.itemProgress.clear();

    for (const item of items) {
      this.itemProgress.set(this.getItemKey(item), {
        item,
        status: "queued",
        lineHandle: null,
      });
    }
  }
}
