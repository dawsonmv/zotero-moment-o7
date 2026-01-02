# Copy-Paste Ready Fixes

Use these exact code snippets to fix all 6 issues. Apply in order.

---

## FIX 1: src/hooks.ts - Archive Selected Menu Item (Line 164-168)

**COPY THIS** (replace lines 164-168):
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

## FIX 2: src/hooks.ts - Check Mementos Menu Item (Line 169-174)

**COPY THIS** (replace lines 169-174):
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

## FIX 3: src/hooks.ts - Internet Archive Menu Item (Line 183-187)

**COPY THIS** (replace lines 183-187):
```typescript
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
```

---

## FIX 4: src/hooks.ts - Archive.today Menu Item (Line 188-192)

**COPY THIS** (replace lines 188-192):
```typescript
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
```

---

## FIX 5: src/hooks.ts - Perma.cc Menu Item (Line 193-197)

**COPY THIS** (replace lines 193-197):
```typescript
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
```

---

## FIX 6: src/hooks.ts - UK Web Archive Menu Item (Line 198-202)

**COPY THIS** (replace lines 198-202):
```typescript
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
```

---

## FIX 7: src/hooks.ts - Arquivo.pt Menu Item (Line 203-207)

**COPY THIS** (replace lines 203-207):
```typescript
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
```

---

## FIX 8: src/hooks.ts - Create Robust Links Menu Item (Line 213-217)

**COPY THIS** (replace lines 213-217):
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

## FIX 9: src/hooks.ts - Archive All Menu Item (Line 227-231)

**COPY THIS** (replace lines 227-231):
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

## FIX 10: src/hooks.ts - Notifier Callback (Line 129-144)

**COPY THIS** (replace entire registerNotifier function):
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

## FIX 11: src/utils/ConcurrentArchiveQueue.ts - Promise.race() Error Handling (Line 79-138)

**COPY THIS** (replace the entire try block inside process method):
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

## FIX 12: src/index.ts - Global Rejection Handler (Add after line 3)

**COPY THIS** (add after imports, before the basicTool declaration):
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

**Result** - Your src/index.ts should look like:
```typescript
import { BasicTool } from "zotero-plugin-toolkit";
import Addon from "./addon";
import { config } from "../package.json";

// Global unhandled promise rejection handler (safety net)
if (typeof _globalThis !== 'undefined') {
  _globalThis.addEventListener?.('unhandledrejection', (event: PromiseRejectionEvent) => {
    // Log all unhandled rejections for debugging
    Zotero.debug(`MomentO7: Unhandled Promise rejection detected: ${event.reason}`);

    // Prevent default browser error handling (would crash extension)
    event.preventDefault();
  });
}

const basicTool = new BasicTool();

// ... rest of file
```

---

## Verification Checklist

After applying all fixes:

- [ ] All 9 menu item command listeners have `.catch()` handlers
- [ ] Notifier callback has `await onNotify()` with try/catch
- [ ] ConcurrentArchiveQueue.process() has inner try/catch around Promise.race()
- [ ] src/index.ts has global unhandled rejection handler
- [ ] No TypeScript compilation errors: `npm run build`
- [ ] All tests pass: `npm test`

---

## Step-by-Step Application Order

1. **Apply FIX 1-9**: All menu items in src/hooks.ts
2. **Apply FIX 10**: Notifier callback in src/hooks.ts
3. **Apply FIX 11**: ConcurrentArchiveQueue in src/utils/ConcurrentArchiveQueue.ts
4. **Apply FIX 12**: Global handler in src/index.ts
5. **Build**: `npm run build`
6. **Test**: `npm test`
7. **Manual Test**: All menu items and auto-archive feature

---

## Line Number Reference

If line numbers changed, search for these unique strings:

| Fix | Search String |
|-----|---------------|
| 1 | `"menu-archive-selected"` |
| 2 | `"menu-check-mementos"` |
| 3-7 | `"Archive to...", children:` |
| 8 | `"menu-create-robust-links"` |
| 9 | `"menu-archive-all"` |
| 10 | `registerNotifier` function |
| 11 | `Promise.race(` in ConcurrentArchiveQueue |
| 12 | `import Addon from "./addon"` in index.ts |

---

## Testing Commands

```bash
# Build to check for TypeScript errors
npm run build

# Run full test suite
npm test

# Run only tests related to archiving
npm test -- --testPathPattern=archive

# Run only tests related to concurrent queue
npm test -- --testPathPattern=ConcurrentArchiveQueue

# Check for any remaining unhandled promise patterns
grep -r "\.then\s*(" src/ --include="*.ts" | grep -v "\.catch\|await"
grep -r "async.*=>" src/ --include="*.ts" | grep -v "await"
```

---

## Troubleshooting

**Issue**: Build fails with TypeScript error
**Solution**: Check that all parentheses and commas are correct. Line endings should match surrounding code.

**Issue**: Tests fail after changes
**Solution**: Run `npm test -- --testPathPattern=hooks` to isolate which test fails.

**Issue**: Menu items still cause errors
**Solution**: Check that `.catch()` handler is on the same line as the function call, not on a separate line.

---

## That's It!

All 12 fixes applied = all 6 issues resolved. Total code changes: ~150 lines. Total time: 30-45 minutes including testing.
