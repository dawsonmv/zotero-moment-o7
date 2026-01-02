# Quick Fix Summary: Unhandled Promise Rejections

## 6 Issues Found - 4 Can Be Fixed with Simple Pattern Changes

### Critical Issues (2)

**Issue 1: Menu Item Command Listeners** - AFFECTS 5 MENU ITEMS
- **File**: `src/hooks.ts`, lines 167, 173, 186-206, 216, 230
- **Problem**: Async functions called without `.catch()` handler
- **Example**: `commandListener: () => onArchiveSelected()` ← Returns Promise<void>, no error handler
- **Fix**: Wrap in `.catch()`:
```typescript
commandListener: () => {
  onArchiveSelected().catch((error) => {
    Zotero.debug(`Error: ${error}`);
    showNotification("fail", `Failed: ${error}`);
  });
}
```

**Issue 2: Notifier Callback** - AFFECTS AUTO-ARCHIVE FEATURE
- **File**: `src/hooks.ts`, line 137
- **Problem**: `onNotify()` called but not awaited
- **Example**: `onNotify(event, type, ids, _extraData);` ← Missing await
- **Fix**: Add await + try/catch:
```typescript
try {
  await onNotify(event, type, ids, _extraData);
} catch (error) {
  Zotero.debug(`Error: ${error}`);
}
```

### High Priority Issues (2)

**Issue 3: Promise.race() Without Fallback**
- **File**: `src/utils/ConcurrentArchiveQueue.ts`, lines 94-96
- **Problem**: If race throws, active promises are orphaned
- **Fix**: Add inner try/catch to Promise.race block

**Issue 4: Menu Item Error Handling** - SAME AS ISSUE 1
- **File**: `src/hooks.ts` (multiple locations)
- **Fix**: See Issue 1 above

### Medium Priority Issues (1)

**Issue 5: Async Menu Functions**
- **File**: `src/hooks.ts`, lines 252-593
- **Problem**: Functions have internal error handling but callbacks don't catch initial rejection
- **Fix**: See Issue 1 above (wrap commandListener)

### Safety Net Issue (1)

**Issue 6: No Global Rejection Handler**
- **File**: `src/index.ts`
- **Problem**: No fallback for unexpected unhandled rejections
- **Fix**: Add global handler:
```typescript
_globalThis.addEventListener?.('unhandledrejection', (event: PromiseRejectionEvent) => {
  Zotero.debug(`Unhandled: ${event.reason}`);
  event.preventDefault();
});
```

---

## Code Changes Summary

### Change 1: Fix 5 Menu Items (10 minutes)
**File**: `src/hooks.ts`
**Pattern**: For each menu item with `commandListener: () => functionName()`:
```typescript
// BEFORE
commandListener: () => onArchiveSelected(),

// AFTER
commandListener: () => {
  onArchiveSelected().catch((error) => {
    Zotero.debug(`MomentO7: Archive selected failed: ${error}`);
    showNotification("fail", `Archive failed: ${error instanceof Error ? error.message : String(error)}`);
  });
},
```

**Affected Lines**:
- Line 167 - Archive Selected
- Line 173 - Check Mementos
- Lines 186-206 - Archive to... (5 services)
- Line 216 - Create Robust Links
- Line 230 - Archive All

### Change 2: Fix Notifier Callback (5 minutes)
**File**: `src/hooks.ts`, lines 129-144

```typescript
// BEFORE
const callback = {
  notify: async (event, type, ids, _extraData) => {
    if (!addon?.data?.alive) return;
    onNotify(event, type, ids, _extraData);  // ← NOT AWAITED
  },
};

// AFTER
const callback = {
  notify: async (event, type, ids, _extraData) => {
    if (!addon?.data?.alive) return;
    try {
      await onNotify(event, type, ids, _extraData);  // ← AWAIT ADDED
    } catch (error) {
      Zotero.debug(`MomentO7: Notifier error: ${error}`);
    }
  },
};
```

### Change 3: Fix Promise.race() (10 minutes)
**File**: `src/utils/ConcurrentArchiveQueue.ts`, lines 79-138

Add inner try/catch around Promise.race:
```typescript
try {
  const result = await Promise.race(...);
  // existing code
} catch (raceError) {
  Zotero.debug(`Race error: ${raceError}`);
  break;  // Exit loop gracefully
}
```

### Change 4: Add Global Handler (5 minutes)
**File**: `src/index.ts`, after imports (around line 14)

```typescript
if (typeof _globalThis !== 'undefined') {
  _globalThis.addEventListener?.('unhandledrejection', (event: PromiseRejectionEvent) => {
    Zotero.debug(`MomentO7: Unhandled Promise rejection: ${event.reason}`);
    event.preventDefault();
  });
}
```

---

## Total Effort: ~30 minutes

| Task | File | Lines | Time |
|------|------|-------|------|
| Fix menu items | src/hooks.ts | 167,173,186-206,216,230 | 10 min |
| Fix notifier | src/hooks.ts | 129-144 | 5 min |
| Fix race() | src/utils/ConcurrentArchiveQueue.ts | 79-138 | 10 min |
| Add global handler | src/index.ts | ~14 | 5 min |
| Testing | Various | N/A | 30+ min |

---

## Testing After Fixes

1. Click each menu item - should show progress/error notifications
2. Add new item to library - should auto-archive silently or log error
3. Archive 10+ items - should show progress window without hanging
4. Interrupt archiving - progress window should close cleanly
5. Open Firefox console (Ctrl+Shift+K) - should show NO "Promise rejection" errors

---

## Before/After Comparison

### Before Fixes
```
User clicks "Archive Selected"
↓
onArchiveSelected() returns Promise but no .catch()
↓
Promise silently rejects in background
↓
User sees no error, thinks feature didn't work
↓
No logs, no notifications, silent failure
```

### After Fixes
```
User clicks "Archive Selected"
↓
onArchiveSelected() returns Promise with .catch() handler
↓
If archiving fails → .catch() catches error
↓
User sees error notification + debug log
↓
Clear feedback on what went wrong
```

---

## Risk Assessment

**Risk of fixes**: VERY LOW
- Adding .catch() handlers is safe - just prevents crashes
- Adding await is safe - promise must complete anyway
- Adding global handler is safe - just logs, doesn't change behavior

**Risk of NOT fixing**: HIGH
- Archiving can silently fail with no user notification
- Memory leaks from orphaned promises
- Auto-archive may not work at all
- Browser console fills with unhandled rejection errors

---

## Related Files (For Reference)

All issues traced to these recent changes:
- `TrafficMonitor.ts` - New, complex async state machine
- `ConcurrentArchiveQueue.ts` - New, uses Promise.race pattern
- `hooks.ts` - Updated with new async operations

---

## Quick Validation Commands

```bash
# Check for remaining .then() without .catch()
grep -r "\.then\s*(" src/ --include="*.ts" | grep -v "\.catch"

# Check for async functions without await
grep -rn "await\|Promise\|async" src/hooks.ts

# Check for unhandled Promise.race
grep -rn "Promise.race" src/ --include="*.ts"

# Verify fixes compile
npm run lint:check
npm run build
```

---

## Next Steps

1. Apply all 4 changes (total 30 minutes of code changes)
2. Run `npm run build` to verify TypeScript compilation
3. Run existing test suite: `npm test`
4. Manual testing of all archive operations
5. Commit with message: "Fix: Handle unhandled promise rejections in UI callbacks"
