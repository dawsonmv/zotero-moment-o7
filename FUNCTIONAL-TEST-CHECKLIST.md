# Functional Testing Checklist - Moment-o7

**Status:** 🔄 IN PROGRESS
**Date Started:** 2026-01-02
**Tester:** [Your Name]
**Zotero Version:** [e.g., 7.0.0]
**OS:** macOS

---

## 📋 Pre-Testing Setup

- [ ] Zotero 7 installed at `/Applications/Zotero.app`
- [ ] Plugin XPI file ready: `.scaffold/build/moment-o-7.xpi` (79 KB)
- [ ] Zotero completely closed (not just minimized)
- [ ] Created test collection with 10-50 items (mix of URLs)

**Test Items Needed:**

- [ ] Simple web pages (Wikipedia, news articles)
- [ ] Complex sites (JavaScript-heavy pages)
- [ ] Academic articles with DOIs
- [ ] Various content types (blogs, PDFs, documents)

---

## 🚀 Installation Steps

1. **Open Zotero:**

   ```bash
   open /Applications/Zotero.app
   ```

   - [ ] Zotero opens without errors
   - [ ] Main window displays

2. **Install Plugin:**
   - [ ] Go to: Tools → Add-ons
   - [ ] Click ⚙️ gear icon (top right)
   - [ ] Select "Install Add-on From File..."
   - [ ] Navigate to: `.scaffold/build/moment-o-7.xpi`
   - [ ] Click "Install"
   - [ ] Zotero prompts to restart
   - [ ] Click "Restart Now"
   - [ ] Zotero closes and restarts

3. **Verify Installation:**
   - [ ] Zotero restarts successfully
   - [ ] No startup errors in console
   - [ ] Tools menu contains "Archive with Momento7"
   - [ ] Right-click on item shows "Archive this Resource"
   - [ ] Preferences dialog opens without errors

---

## ✅ Testing Phases

### Phase 1: Plugin Loads (5 min) 🟢 CRITICAL

**Pass Criteria:** Plugin visible in UI, no errors

- [ ] Plugin appears in Tools menu
- [ ] Right-click context menu item visible
- [ ] Preferences dialog opens
- [ ] No console errors on startup

**Debug if issues:**

```
Help → Debug Output Logging
Look for: [Moment-o7] messages
Check for: TypeError, ReferenceError, uncaught promise
```

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 2: Single Item Archiving (15 min) 🟢 CRITICAL

**Pass Criteria:** Basic archiving works, metadata stored

- [ ] Select one item with URL
- [ ] Right-click → "Archive this Resource"
- [ ] Select "Internet Archive"
- [ ] Wait for completion
- [ ] Item shows status update
- [ ] Archive URL saved to item metadata
- [ ] Extra field contains archive URL
- [ ] Test error handling: select item with NO URL
- [ ] Appropriate error message displayed

**Expected behavior:**

- Dialog shows progress: "Archiving..."
- Completes successfully
- Item metadata updated
- Error message for missing URL

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 3: Concurrent Batch (10 min) 🟡 HIGH PRIORITY

**Pass Criteria:** Multiple items process in parallel

- [ ] Create test collection with 10-15 items
- [ ] Select all items
- [ ] Right-click → "Archive this Resource"
- [ ] Progress window shows: "Archiving (X/10)"
- [ ] Multiple items processing simultaneously
- [ ] Items complete in mixed order (not sequential)
- [ ] Final message shows completion count
- [ ] All items archived successfully

**Expected behavior:**

- Progress indicates concurrent processing
- Faster than sequential (should finish ~4x faster for 10 items)
- No items skipped or duplicated

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 4: Traffic Monitoring Display (10 min) 🟡 HIGH PRIORITY

**Pass Criteria:** Traffic scores visible in progress

- [ ] Start archiving 10+ items
- [ ] Observe progress header
- [ ] Should show traffic like: "Archiving (5/10) | IA: 0.8"
- [ ] Slow requests show traffic score
- [ ] Fast requests show score of 0
- [ ] Different services show different scores

**Expected behavior:**

- Traffic scores appear for slow services
- Scores increase with request duration
- Format: "ServiceName: X.X"

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 5: Service Jamming Detection (10 min) 🟡 HIGH PRIORITY

**Pass Criteria:** Jamming detected when service slow

- [ ] Archive items to same service multiple times
- [ ] Some requests take >2 seconds
- [ ] Service marked "JAMMED" when score >= 2.0
- [ ] Jammed service filtered from fallback
- [ ] Next batch uses fallback services instead

**Expected behavior:**

- Service scores accumulate
- Threshold of 2.0 triggers "JAMMED" state
- Service skipped in subsequent requests

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 6: Fallback Chain (10 min) 🟡 HIGH PRIORITY

**Pass Criteria:** Fallback services used correctly

- [ ] Configure fallback order: IA → Archive.today → Perma.cc
- [ ] Archive with "Create Robust Link (All Archives)"
- [ ] Primary service succeeds for some items
- [ ] Items use fallback if primary fails
- [ ] Multiple archives per item tracked

**Expected behavior:**

- Items use primary service first
- Fallback used when primary unavailable
- All archives stored in metadata

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 7: Robust Links (10 min)

**Pass Criteria:** Archive notes created correctly

- [ ] Archived items have note with archive link
- [ ] Note includes data attributes (originalurl, versionurl, etc)
- [ ] Date and service name displayed
- [ ] HTML link is clickable
- [ ] Archive URL in note matches metadata

**Expected behavior:**

- Note created automatically
- Contains formatted HTML with archive link
- Shows archive date and service

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 8: Preferences (10 min)

**Pass Criteria:** Settings saved and applied

- [ ] Open Preferences
- [ ] Toggle "Auto-archive new items"
- [ ] Change default service
- [ ] Modify fallback order
- [ ] Close and reopen preferences
- [ ] Settings persist correctly
- [ ] Changes applied to next archive operation

**Expected behavior:**

- All settings preserved
- UI reflects saved values
- New operations use updated settings

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 9: Error Handling (10 min) 🔴 CRITICAL

**Pass Criteria:** Graceful error handling, no crashes

- [ ] Network error → appropriate message
- [ ] Timeout → handled gracefully
- [ ] No URL → helpful error message
- [ ] Batch continues after item failure
- [ ] **CRITICAL:** No crashes or unhandled exceptions
- [ ] Debug console: NO "Uncaught (in promise) undefined"
- [ ] Debug console: NO TypeError/ReferenceError

**Expected behavior:**

- Clear error messages shown
- Batch processing continues
- Zotero remains responsive
- No red errors in debug console

**Result:** ✅ PASS / ❌ FAIL

**Critical Check:**

```
Help → Debug Output Logging
Search for:
❌ "Uncaught promise"
❌ "Uncaught (in promise)"
❌ "TypeError"
❌ "[Moment-o7]" errors (only info/debug OK)
```

---

### Phase 10: Performance (15 min) 🔴 CRITICAL

**Pass Criteria:** Large batch processing, Zotero responsive

- [ ] Create test with 50+ items
- [ ] Archive all items
- [ ] Monitor memory usage (Activity Monitor)
- [ ] Zotero remains responsive
- [ ] No "Not Responding" message
- [ ] Batch completes successfully
- [ ] No memory errors or warnings

**Expected behavior:**

- Completes without hanging
- Memory usage stable
- UI remains responsive during archiving
- No significant slowdown

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 11: Data Integrity (10 min)

**Pass Criteria:** Data stored correctly

- [ ] Original item metadata unchanged
- [ ] Archive URLs stored in Extra field
- [ ] Multiple archives per item tracked
- [ ] Tags properly applied ("archived")
- [ ] Notes created with correct info
- [ ] Export/import preserves archive data

**Expected behavior:**

- All data stored in standard Zotero fields
- Can export/import without loss
- Metadata follows documented format

**Result:** ✅ PASS / ❌ FAIL

---

### Phase 12: Stability (15 min) 🔴 CRITICAL

**Pass Criteria:** Stable operation, no errors

- [ ] Archive 3+ batches of items
- [ ] No crashes between batches
- [ ] No memory leaks (activity monitor)
- [ ] No performance degradation
- [ ] Clear error messages only
- [ ] Debug console: **NO promise rejection errors**
- [ ] **CRITICAL:** Zero "Uncaught promise rejection: ..."

**Expected behavior:**

- Multiple batches process without issues
- Stable memory usage
- No degradation over time
- Clean debug console

**Result:** ✅ PASS / ❌ FAIL

**Critical Check:**

```
Help → Debug Output Logging
Look for EXACT pattern:
❌ "[Moment-o7] Uncaught promise rejection: ..."

If found = CRITICAL FAILURE
```

---

## 📊 Results Summary

| Phase | Status | Notes                 |
| ----- | ------ | --------------------- |
| 1     | ✅/❌  | Plugin Loads          |
| 2     | ✅/❌  | Single Item Archiving |
| 3     | ✅/❌  | Concurrent Batch      |
| 4     | ✅/❌  | Traffic Monitoring    |
| 5     | ✅/❌  | Service Jamming       |
| 6     | ✅/❌  | Fallback Chain        |
| 7     | ✅/❌  | Robust Links          |
| 8     | ✅/❌  | Preferences           |
| 9     | ✅/❌  | Error Handling        |
| 10    | ✅/❌  | Performance           |
| 11    | ✅/❌  | Data Integrity        |
| 12    | ✅/❌  | Stability             |

---

## 🎯 Critical Success Indicators

### MUST PASS (Blocking Issues)

- [ ] Phase 1: Plugin loads
- [ ] Phase 2: Basic archiving works
- [ ] Phase 9: Error handling (NO crashes)
- [ ] Phase 10: Performance (responsive)
- [ ] Phase 12: Stability (NO promise errors)

### SHOULD PASS (High Priority)

- [ ] Phase 3: Concurrent batch
- [ ] Phase 4: Traffic monitoring
- [ ] Phase 5: Service jamming
- [ ] Phase 6: Fallback chain

### NICE TO HAVE (Medium Priority)

- [ ] Phase 7: Robust links formatting
- [ ] Phase 8: Preferences persistence
- [ ] Phase 11: Data integrity verification

---

## 📝 Issues Found

**Issue #1:**

- Phase: [1-12]
- Description: [What went wrong]
- Steps to Reproduce: [How to reproduce]
- Expected: [What should happen]
- Actual: [What happened]
- Severity: Critical/High/Medium/Low
- Screenshot: [If applicable]

**Issue #2:**
[Same format as above]

---

## 🎓 Debug Tips

### View Console Output

```
Help → Debug Output Logging
Watch in real-time as you test
Look for [Moment-o7] messages
```

### Check for Promise Errors

```
Search for: "Uncaught promise"
This MUST NOT appear
If it does = CRITICAL FAILURE
```

### Monitor Performance

```
Activity Monitor → Zotero
Watch Memory (should stay stable)
Watch CPU (should spike during archiving only)
```

### Capture Error Details

```
If error occurs:
1. Note exact error message
2. Screenshot or copy text
3. Note which phase failed
4. Restart Zotero
5. Try to reproduce
```

---

## ✅ Final Checklist

**Before Declaring Ready:**

- [ ] All 12 phases tested
- [ ] All CRITICAL phases passed
- [ ] No crashes observed
- [ ] No unhandled promise rejections in console
- [ ] Performance acceptable (responsive)
- [ ] Data integrity verified
- [ ] Testing report completed below

---

## 📄 Testing Report

**Overall Status:** ✅ READY / ⚠️ ISSUES FOUND / ❌ BLOCKED

**Summary:**

- Total Phases Tested: \_\_\_/12
- Phases Passed: \_\_\_/12
- Critical Failures: \_\_\_
- High Priority Issues: \_\_\_
- Medium Priority Issues: \_\_\_

**Recommendation:**

- [ ] Ready to merge and deploy
- [ ] Fix issues and retest
- [ ] Escalate to development team

**Tester Notes:**
[Add any additional observations, quirks, or notable behaviors]

---

## 🚀 Next Steps

**If All Tests Pass ✅:**

1. Complete this checklist
2. Create GitHub issue: "TASK-009: Functional Testing - PASSED"
3. Merge feature branch to main
4. Create GitHub release v1.0.0
5. Deploy to production

**If Issues Found ❌:**

1. Document each issue in this checklist
2. Create GitHub issues for each critical/high-priority item
3. Return to development team
4. Schedule re-testing after fixes

---

**Testing Started:** [Date/Time]
**Testing Completed:** [Date/Time]
**Total Time:** [Hours spent]

**Tester Signature:** **\*\*\*\***\_\_**\*\*\*\*** **Date:** \***\*\_\_\*\***
