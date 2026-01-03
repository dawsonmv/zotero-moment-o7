/**
 * Type augmentations for Zotero 7 APIs not yet in zotero-types
 * These are verified to exist in the Zotero 7 API but missing from type definitions
 */

declare namespace Zotero {
  /**
   * Get the active Zotero pane (Zotero itemsTree view)
   * Returns null if no Zotero pane is active
   */
  function getActiveZoteroPane(): _ZoteroTypes.ZoteroPane | null;

  /**
   * Get the main Zotero window
   */
  function getMainWindow(): Window | null;

  /**
   * Libraries manager - provides access to user library and other libraries
   */
  const Libraries: {
    readonly userLibraryID: number;
    readonly userLibrary: Zotero.Library;
    [key: number]: Zotero.Library;
  };

  /**
   * Items manager - provides access to items
   */
  const Items: {
    /**
     * Get a single item by ID
     */
    get(id: number): Zotero.Item | null;

    /**
     * Get multiple items by IDs
     */
    getAsync(ids: number[]): Promise<Zotero.Item[]>;
  };
}
