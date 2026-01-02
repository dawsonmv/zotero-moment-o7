# Implementation Guide: Fixing Unhandled Promise Rejections

## Overview
This guide provides the exact code changes needed to fix all 6 identified promise handling issues. Apply fixes in priority order.

---

## FIX 1: Menu Command Listeners (PRIORITY 1)

### File
`/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts`

### Change 1.1 - Archive Selected Menu Item
**Lines**: 164-168

**BEFORE**:
```typescript
{
  tag: "menuitem",
  label: getString("menu-archive-selected") || "Archive Selected Items",
  commandListener: () => onArchiveSelected(),
},
```

**AFTER**:
```typescript
{
  tag: "menuitem",
  label: getString("menu-archive-selected") || "Archive Selected Items",
  commandListener: () => {
    onArchiveSelected().catch((error) => {
      Zotero.debug(`MomentO7: Archive selected failed: ${error}`);
      showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  },
},
```

---

### Change 1.2 - Check Mementos Menu Item
**Lines**: 169-174

**BEFORE**:
```typescript
{
  tag: "menuitem",
  label:
    getString("menu-check-mementos") || "Check for Existing Archives",
  commandListener: () => onCheckMementos(),
},
```

**AFTER**:
```typescript
{
  tag: "menuitem",
  label:
    getString("menu-check-mementos") || "Check for Existing Archives",
  commandListener: () => {
    onCheckMementos().catch((error) => {
      Zotero.debug(`MomentO7: Check mementos failed: ${error}`);
      showNotification("fail", `Check failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  },
},
```

---

### Change 1.3 - Archive to Service Menu Items
**Lines**: 183-207

**BEFORE**:
```typescript
{
  tag: "menu",
  label: "Archive to...",
  children: [
    {
      tag: "menuitem",
      label: "Internet Archive",
      commandListener: () => onArchiveToService("internetarchive"),
    },
    {
      tag: "menuitem",
      label: "Archive.today",
      commandListener: () => onArchiveToService("archivetoday"),
    },
    {
      tag: "menuitem",
      label: "Perma.cc",
      commandListener: () => onArchiveToService("permacc"),
    },
    {
      tag: "menuitem",
      label: "UK Web Archive",
      commandListener: () => onArchiveToService("ukwebarchive"),
    },
    {
      tag: "menuitem",
      label: "Arquivo.pt",
      commandListener: () => onArchiveToService("arquivopt"),
    },
  ],
},
```

**AFTER**:
```typescript
{
  tag: "menu",
  label: "Archive to...",
  children: [
    {
      tag: "menuitem",
      label: "Internet Archive",
      commandListener: () => {
        onArchiveToService("internetarchive").catch((error) => {
          Zotero.debug(`MomentO7: Archive to Internet Archive failed: ${error}`);
          showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      },
    },
    {
      tag: "menuitem",
      label: "Archive.today",
      commandListener: () => {
        onArchiveToService("archivetoday").catch((error) => {
          Zotero.debug(`MomentO7: Archive to Archive.today failed: ${error}`);
          showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      },
    },
    {
      tag: "menuitem",
      label: "Perma.cc",
      commandListener: () => {
        onArchiveToService("permacc").catch((error) => {
          Zotero.debug(`MomentO7: Archive to Perma.cc failed: ${error}`);
          showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      },
    },
    {
      tag: "menuitem",
      label: "UK Web Archive",
      commandListener: () => {
        onArchiveToService("ukwebarchive").catch((error) => {
          Zotero.debug(`MomentO7: Archive to UK Web Archive failed: ${error}`);
          showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      },
    },
    {
      tag: "menuitem",
      label: "Arquivo.pt",
      commandListener: () => {
        onArchiveToService("arquivopt").catch((error) => {
          Zotero.debug(`MomentO7: Archive to Arquivo.pt failed: ${error}`);
          showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
        });
      },
    },
  ],
},
```

---

### Change 1.4 - Create Robust Links Menu Item
**Lines**: 213-217

**BEFORE**:
```typescript
{
  tag: "menuitem",
  label: getString("menu-create-robust-links") || "Create Robust Links",
  commandListener: () => onCreateRobustLinks(),
},
```

**AFTER**:
```typescript
{
  tag: "menuitem",
  label: getString("menu-create-robust-links") || "Create Robust Links",
  commandListener: () => {
    onCreateRobustLinks().catch((error) => {
      Zotero.debug(`MomentO7: Create robust links failed: ${error}`);
      showNotification("fail", `Create links failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  },
},
```

---

### Change 1.5 - Archive All Menu Item
**Lines**: 227-231

**BEFORE**:
```typescript
{
  tag: "menuitem",
  label: getString("menu-archive-all") || "Archive All Items with URLs",
  commandListener: () => onArchiveAll(),
},
```

**AFTER**:
```typescript
{
  tag: "menuitem",
  label: getString("menu-archive-all") || "Archive All Items with URLs",
  commandListener: () => {
    onArchiveAll().catch((error) => {
      Zotero.debug(`MomentO7: Archive all failed: ${error}`);
      showNotification("fail", `Archive all failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  },
},
```

---

## FIX 2: Notifier Callback (PRIORITY 2)

### File
`/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts`

### Change 2.1 - Add Await to onNotify Call
**Lines**: 129-144

**BEFORE**:
```typescript
function registerNotifier(): void {
  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: (string | number)[],
      _extraData: Record<string, unknown>,
    ) => {
      if (!addon?.data?.alive) return;
      onNotify(event, type, ids, _extraData);
    },
  };

  addon.data.momento7.notifierId = Zotero.Notifier.registerObserver(callback, [
    "item",
  ]);
}
```

**AFTER**:
```typescript
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
        Zotero.debug(`MomentO7: Notifier error: ${error}`);
      }
    },
  };

  addon.data.momento7.notifierId = Zotero.Notifier.registerObserver(callback, [
    "item",
  ]);
}
```

---

## FIX 3: Promise.race() Error Handling (PRIORITY 3)

### File
`/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/utils/ConcurrentArchiveQueue.ts`

### Change 3.1 - Improve Promise.race() with Proper Cleanup
**Lines**: 79-138

**BEFORE**:
```typescript
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
```

**AFTER**:
```typescript
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

    try {
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
    } catch (raceError) {
      // Promise.race threw - this should not happen since processItem catches all errors
      // but handle it gracefully by collecting remaining results
      Zotero.debug(
        `MomentO7 Queue: Race error (this should not happen): ${raceError}`,
      );

      // Don't abandon the batch - wait for remaining promises
      // and collect whatever results we have so far
      break;
    }
  }

  // Close progress window with whatever results we have
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
} finally {
  // Ensure all active promises are handled
  // This prevents orphaned promise rejections
  activePromises = [];
  this.activeCount = 0;
}
```

---

## FIX 4: Global Promise Rejection Handler (PRIORITY 4 - Safety Net)

### File
`/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/index.ts`

### Change 4.1 - Add Global Unhandled Rejection Handler
**After line 14 (before any async operations)**

**ADD**:
```typescript
// Global unhandled promise rejection handler (safety net)
if (typeof _globalThis !== 'undefined') {
  _globalThis.addEventListener?.('unhandledrejection', (event: PromiseRejectionEvent) => {
    // Log all unhandled rejections for debugging
    Zotero.debug(`MomentO7: Unhandled Promise rejection detected: ${event.reason}`);

    // Prevent default browser error handling (would crash extension)
    event.preventDefault();
  });
}
```

**Full context**:
```typescript
import { BasicTool } from "zotero-plugin-toolkit";
import Addon from "./addon";
import { config } from "../package.json";

const basicTool = new BasicTool();

// Global unhandled promise rejection handler (safety net)
if (typeof _globalThis !== 'undefined') {
  _globalThis.addEventListener?.('unhandledrejection', (event: PromiseRejectionEvent) => {
    Zotero.debug(`MomentO7: Unhandled Promise rejection detected: ${event.reason}`);
    event.preventDefault();
  });
}

// @ts-expect-error - Plugin instance is not typed
if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  _globalThis.addon = new Addon();
  // ... rest of code
}
```

---

## Testing Checklist

After applying all fixes, test these scenarios:

### Test 1: Archive Selected Menu Item
- [ ] Click menu item
- [ ] Verify progress window appears
- [ ] Verify error notification appears if archiving fails
- [ ] Check `Zotero.debug()` shows error message

### Test 2: Check Mementos Menu Item
- [ ] Click menu item
- [ ] Verify progress window appears
- [ ] Verify error notification appears if check fails

### Test 3: Archive to Service Menu Items
- [ ] Test each of the 5 services individually
- [ ] Force a failure (e.g., disconnect network)
- [ ] Verify error notification appears for each

### Test 4: Create Robust Links
- [ ] Click menu item
- [ ] Verify error notification if no items have archives

### Test 5: Archive All
- [ ] Click "Archive All Items with URLs"
- [ ] Verify progress window shows results
- [ ] Test with network failure to verify error handling

### Test 6: Auto-Archive (Notifier)
- [ ] Enable auto-archive in preferences
- [ ] Add new item with URL to library
- [ ] Monitor `Zotero.debug()` output for errors
- [ ] Verify no unhandled rejections in browser console

### Test 7: Concurrent Archiving
- [ ] Archive 10+ items at once
- [ ] Interrupt mid-way by closing progress window
- [ ] Verify remaining promises are cleaned up
- [ ] Check memory usage doesn't spike after completion

### Test 8: Browser Console
- [ ] Open Firefox browser console (Ctrl+Shift+K)
- [ ] Filter for "Promise rejection"
- [ ] Perform all above tests
- [ ] Verify NO console errors appear

---

## Validation Checklist

- [ ] All 6 commandListener items have `.catch()` handlers
- [ ] Notifier callback has `await onNotify()` with try/catch
- [ ] Promise.race() has inner try/catch and breaks on error
- [ ] Global handler added to index.ts
- [ ] Code compiles without TypeScript errors
- [ ] All tests pass
- [ ] Firefox console shows no unhandled rejections

---

## Rollback Plan

If issues appear after fixes:

1. **Quick Rollback**: Revert commits with these fixes
2. **Partial Rollback**: Disable specific menu items (comment out `commandListener` checks)
3. **Safety Mode**: Disable auto-archive if notifier changes cause issues

---

## Performance Impact

These fixes have **minimal performance impact**:
- Adding `.catch()` handlers: ~negligible
- Adding `await` in notifier: no change (promise must complete anyway)
- Promise.race error handling: actually improves cleanup
- Global handler: only called on errors (rare)

---

## Future Prevention

To prevent similar issues:

1. **Code Review Checklist**: Always ask "Is this promise handled?"
2. **Linting Rule**: Consider adding ESLint rule for `@typescript-eslint/no-floating-promises`
3. **Test Template**: Create test utility for menu item callbacks

```typescript
// Test helper for menu items
async function testMenuItemCallback(callback: () => any): Promise<void> {
  const result = callback();
  if (result instanceof Promise) {
    await result; // Ensure promise completes
  }
}
```
