# Uncaught Promise Rejections and Unhandled Promise Errors Analysis

## Executive Summary

Found **6 critical issues** related to unhandled promise rejections in the zotero-momento7-new codebase. These issues were introduced or amplified by recent changes to concurrent archiving and traffic monitoring. Primary risk areas are in UI callbacks and the notifier system.

---

## Critical Issues Found

### 1. CRITICAL: Menu Command Listeners Fire-and-Forget Async Promises

**Location**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts` (Lines 167, 173, 186-206, 216, 230)

**Pattern**:
```typescript
commandListener: () => onArchiveSelected(),  // Line 167
commandListener: () => onCheckMementos(),    // Line 173
commandListener: () => onArchiveToService("internetarchive"),  // Lines 186-206
commandListener: () => onCreateRobustLinks(), // Line 216
commandListener: () => onArchiveAll(),       // Line 230
```

**Issue**:
- These command listeners return **async function calls** without awaiting or catching
- The async functions are:
  - `onArchiveSelected()` - async (line 367)
  - `onCheckMementos()` - async (line 423)
  - `onArchiveToService()` - async (line 252)
  - `onCreateRobustLinks()` - async (line 478)
  - `onArchiveAll()` - async (line 520)
- If any of these promises reject, the error will be **unhandled and logged to browser console**
- No error handling mechanism exists for UI callback failures

**Example Code Flow**:
```typescript
// Line 167 - Fire-and-forget promise
commandListener: () => onArchiveSelected()  // Returns Promise<void> but no catch handler
// If onArchiveSelected() throws, promise rejection is uncaught
```

**Why It's Problematic**:
- Unhandled promise rejections in Firefox extensions can cause background errors
- Users won't know archiving failed if an exception occurs
- Cascades into concurrency issues with ConcurrentArchiveQueue
- Recent traffic monitoring changes increase likelihood of failures

**Suggested Fix**:
```typescript
commandListener: () => {
  onArchiveSelected().catch((error) => {
    Zotero.debug(`MomentO7: Archive selected failed: ${error}`);
    showNotification("fail", `Archive failed: ${error}`);
  });
}
```

---

### 2. CRITICAL: Notifier Callback Not Awaiting Promise

**Location**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts` (Lines 129-137)

**Code**:
```typescript
const callback = {
  notify: async (
    event: string,
    type: string,
    ids: (string | number)[],
    _extraData: Record<string, unknown>,
  ) => {
    if (!addon?.data?.alive) return;
    onNotify(event, type, ids, _extraData);  // Line 137: NOT AWAITED
  },
};
```

**Issue**:
- `onNotify()` is an async function (line 312) that returns `Promise<void>`
- The callback **does not await** the promise
- If `onNotify()` rejects during auto-archiving, rejection is **uncaught**
- The promise may complete after callback has already returned

**Why It's Problematic**:
- Auto-archive feature introduced in recent commits relies on this notifier
- Errors in archiving new items won't be caught
- Cascading failures across multiple items won't stop immediately
- No logging of auto-archive failures to user

**Code Path**:
```typescript
// Item added → Notifier fires → onNotify() called but NOT awaited
// onNotify() → coordinator.autoArchive() → promise hangs in background
// If archiving fails, error is unhandled
```

**Suggested Fix**:
```typescript
notify: async (
  event: string,
  type: string,
  ids: (string | number)[],
  _extraData: Record<string, unknown>,
) => {
  if (!addon?.data?.alive) return;
  try {
    await onNotify(event, type, ids, _extraData);  // ADD AWAIT
  } catch (error) {
    Zotero.debug(`MomentO7: Notifier error: ${error}`);
  }
}
```

---

### 3. HIGH: Promise.race() Without Complete Error Handling

**Location**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/utils/ConcurrentArchiveQueue.ts` (Lines 94-96)

**Code**:
```typescript
// Line 94-96
const result = await Promise.race(
  activePromises.map((entry) => entry.promise),
);
```

**Issue**:
- `Promise.race()` will throw if ANY of the promises reject
- While individual `processItem()` promises handle their own errors (line 183), if an error escapes uncaught, it will bubble up
- The outer try/catch (line 132) catches it, but **other promises remain active and unhandled**
- If race throws, active promises continue running but are abandoned

**Why It's Problematic**:
- Active promises still in `activePromises` array are orphaned after `Promise.race()` throws
- Those orphaned promises might later reject, causing unhandled rejections
- Concurrent items processing stops abruptly without cleanup
- Traffic monitoring stays active for abandoned requests

**Scenario**:
```typescript
// If Promise.race throws:
// 1. activePromises[0], activePromises[1], etc still executing
// 2. Their errors won't be caught because they're abandoned
// 3. Promise.race() error is caught and function exits
// 4. Orphaned promises may reject seconds later: UNHANDLED
```

**Suggested Fix**:
```typescript
try {
  const result = await Promise.race(
    activePromises.map((entry) => entry.promise),
  );
  // ... rest of code
} catch (error) {
  // Clear all active promises to prevent orphaned rejections
  activePromises.forEach(entry => {
    // Mark as abandoned to prevent handling in finally
  });
  Zotero.debug(`MomentO7 Queue: Race error: ${error}`);
  throw error; // Re-throw to be caught by outer try/catch
}
```

---

### 4. HIGH: Notifier Callback Not Handling Promise Chain in onNotify

**Location**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts` (Lines 336-342)

**Code in onNotify()**:
```typescript
for (const item of archivableItems) {
  try {
    await coordinator.autoArchive(item);  // This is correctly awaited
  } catch (error) {
    ztoolkit.log(`Auto-archive failed for item ${item.id}: ${error}`);
  }
}
```

**Issue**:
- The loop is sequential (correctly uses await)
- **BUT** the parent `notify` callback doesn't await `onNotify()` (see Issue #2)
- So while individual items are handled, the entire onNotify function completion is untracked
- If archiving takes longer than Zotero expects, callback may be garbage collected

**Suggested Fix**: (Combined with Issue #2)
Ensure `notify` callback properly awaits as shown in Issue #2 fix

---

### 5. MEDIUM: Menu Item Async Functions With No Error Notification

**Location**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts` (Lines 252-307, 367-418, 423-473, 478-515, 520-593)

**Functions with inadequate error handling**:

**onArchiveToService()** (lines 299-306):
```typescript
catch (error) {
  progressWin.changeLine({
    text: `Archive failed: ${error}`,  // Generic error display
    type: "fail",
    progress: 100,
  });
  progressWin.startCloseTimer(5000);
}
```

**onArchiveSelected()** (lines 409-417):
```typescript
catch (error) {
  progressWin.changeLine({
    text: `Archive failed: ${error}`,
    type: "fail",
    progress: 100,
  });
  progressWin.startCloseTimer(5000);
  ztoolkit.log(`Archive error: ${error}`);
}
```

**Issue**:
- Try/catch blocks exist but commandListener callbacks still don't await these functions
- Error handling inside functions is good, but **initial promise rejection is never caught at callback level**
- If promise rejects before entering try block, it's unhandled

**Suggested Fix**: (Combined with Issue #1)
Wrap all commandListener calls with proper error handling at callback level

---

### 6. MEDIUM: Unhandled Promise in onMainWindowLoad

**Location**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts` (Lines 75-97)

**Code**:
```typescript
async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // ... code ...
  const popupWin = new ztoolkit.ProgressWindow(...)
    .createLine({ ... })
    .show();
}
```

**Issue**:
- Function returns `Promise<void>` but it's awaited in onStartup (line 46)
- `show()` might be async (chainable pattern)
- If `.show()` fails, promise rejects but callback has already returned
- The `popupWin` is not stored, so no error handling reference exists

**Why It's Less Critical**:
- This is only called at startup
- Failure just means notification doesn't show (not critical functionality)
- But still technically an unhandled promise pattern

**Suggested Fix**:
```typescript
try {
  const popupWin = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: 3000,
  })
    .createLine({
      text: getString("startup-ready") || "Moment-o7 ready",
      type: "success",
    })
    .show();
} catch (error) {
  ztoolkit.log(`Failed to show startup notification: ${error}`);
}
```

---

## Root Cause Analysis

### Why These Issues Exist

1. **Callback Pattern Disconnect**: Zotero's menu/notifier callback API expects synchronous callbacks, but recent changes added async operations without proper wrapping

2. **Traffic Monitoring & Concurrency**: New `TrafficMonitor` and `ConcurrentArchiveQueue` utilities introduced complex async patterns that can fail, but UI callbacks weren't updated to handle these failures

3. **Missing Central Error Handler**: No global error handler for async callbacks, so all errors must be caught locally

4. **Promise Chain Breaks**: When async functions are called but not awaited, the promise chain is broken and errors escape

---

## Pattern Detection Regex

### To find similar issues in future:

```regex
# Fire-and-forget pattern 1: commandListener calling async without catch
commandListener:\s*\(\)\s*=>\s*(\w+)\(\)

# Fire-and-forget pattern 2: notify callback not awaiting call
notify:\s*async.*onNotify\([^;]*\)(?!\s*await)

# Promise.race without complete error handling
Promise\.race\s*\([^)]*\)(?!\s*catch)
```

---

## Monitoring & Detection

### Log Patterns to Watch For

```
Firefox console errors:
- "Uncaught Promise rejection"
- "TypeError: Cannot read property 'xxx' of undefined" during/after archiving
- Silent failures when menu items clicked

Zotero debug logs (check with `Zotero.debug()` calls):
- "Archive error:" prefix suggests unhandled rejection
- Missing "Archive completed" messages after "Archiving X items..."
```

### Potential Runtime Symptoms

1. User clicks "Archive Selected" but nothing happens (no progress window)
2. Auto-archive silently fails for new items without notification
3. Concurrent archiving stops mid-batch without error message
4. Multiple archive operations interfere with each other
5. Memory leaks from abandoned promises in ConcurrentArchiveQueue

---

## Recommended Fixes (Priority Order)

### PRIORITY 1: Fix Menu Command Listeners
**File**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts`
**Lines**: 167, 173, 186-206, 216, 230
**Effort**: Low (pattern replacement)

### PRIORITY 2: Fix Notifier Callback
**File**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/hooks.ts`
**Lines**: 129-137
**Effort**: Low (add await + try/catch)

### PRIORITY 3: Improve Promise.race() Handling
**File**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/utils/ConcurrentArchiveQueue.ts`
**Lines**: 94-96, 132-137
**Effort**: Medium (track and cleanup orphaned promises)

### PRIORITY 4: Add Global Promise Rejection Handler
**File**: `/Users/dawsonvaldes/Documents/GitHub Repos/zotero-momento7-new/src/addon.ts` or `/src/index.ts`
**Effort**: Medium (setup global handler as safety net)
**Benefit**: Catches any future unhandled rejections automatically

```typescript
// Add to index.ts or addon.ts
if (typeof _globalThis !== 'undefined') {
  _globalThis.addEventListener?.('unhandledrejection', (event: any) => {
    Zotero.debug(`MomentO7: Unhandled Promise rejection: ${event.reason}`);
    event.preventDefault(); // Prevent default error handling
  });
}
```

---

## Testing Recommendations

1. **Unit Tests**: Mock async callbacks and verify error handling
2. **Integration Tests**: Simulate slow archive services that timeout
3. **Stress Tests**: Archive 50+ items concurrently with mixed failures
4. **User Acceptance**: Verify UI notifications appear for all error conditions

---

## Timeline Context

These issues were likely introduced in recent commits:
- `0078655` - "Fix critical security and memory issues" - May have added concurrent archiving
- `6477da8` - "Complete migration to zotero-plugin-template architecture" - May have changed callback patterns

The `TrafficMonitor` utility (new) and `ConcurrentArchiveQueue` (new) are complex async systems that expose callback handling weaknesses.

---

## Impact Assessment

**Severity**: HIGH - User data loss risk (archiving silently fails)
**Scope**: Wide - Affects all archiving operations and auto-archive
**Effort to Fix**: LOW - Mostly pattern replacement and adding await/catch
**Test Coverage**: Good - Existing test suite should catch regressions
