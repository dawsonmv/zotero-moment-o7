# Functional Testing Quick Reference

**Status**: Ready to test
**XPI File**: `.scaffold/build/moment-o-7.xpi` (78 KB)
**Test Time**: 1-3 hours
**Items Needed**: 10-50 test items with URLs

---

## Setup (5 minutes)

1. **Open Zotero**:

   ```bash
   open /Applications/Zotero.app
   ```

2. **Install Plugin**:
   - Tools → Add-ons
   - ⚙️ gear icon → "Install Add-on From File..."
   - Select: `.scaffold/build/moment-o-7.xpi`
   - Restart Zotero

3. **Enable Debug Logging** (Optional):
   - Help → Debug Output Logging
   - Zotero Console → `Zotero.Debug.setStore(true)`

---

## Quick Test Phases (12 total)

### ✅ Phase 1: Plugin Loads (5 min)

- [ ] Plugin in Tools menu
- [ ] "Archive this Resource" in right-click menu
- [ ] Preferences open without errors
- [ ] No startup console errors

**Pass Criteria**: Plugin visible in UI, no errors

---

### ✅ Phase 2: Single Item Archiving (15 min)

- [ ] Archive to Internet Archive → success
- [ ] Archive to Archive.today → success
- [ ] URL saved in item metadata
- [ ] Extra field contains `*Archived: <url>`
- [ ] Error handling for items with no URL

**Pass Criteria**: Archived URL in metadata, proper error messages

---

### ✅ Phase 3: Concurrent Batch (10 min) 🆕

- [ ] Select 10+ items
- [ ] Right-click → Archive this Resource
- [ ] Progress window shows "Archiving (X/10)"
- [ ] Items complete in mixed order (parallel)
- [ ] Final message: "Complete: X archived, Y failed"

**Pass Criteria**: All items processed, results match input count

---

### ✅ Phase 4: Traffic Monitoring (10 min) 🆕

- [ ] Progress shows traffic data: "Archiving (5/10) | IA: 0.8"
- [ ] Slow requests (>1s) increase score
- [ ] Fast requests (<1s) score = 0

**Pass Criteria**: Traffic scores visible in progress header

---

### ✅ Phase 5: Service Jamming (10 min) 🆕

- [ ] Multiple slow requests to same service
- [ ] Service marked "JAMMED" when score ≥ 2.0
- [ ] Jammed service filtered from fallback

**Pass Criteria**: Jamming detection and filtering works

---

### ✅ Phase 6: Fallback Chain (10 min)

- [ ] Configure fallback: IA → Archive.today → Perma.cc
- [ ] Archive with "Create Robust Link (All Archives)"
- [ ] Some items use fallback successfully

**Pass Criteria**: Items archived with fallback services

---

### ✅ Phase 7: Robust Links (10 min)

- [ ] Archived items have note with link
- [ ] HTML includes data attributes
- [ ] Date and service name shown

**Pass Criteria**: Robust links generated and stored

---

### ✅ Phase 8: Preferences (10 min)

- [ ] Auto-archive toggle works
- [ ] Default service selection persists
- [ ] Fallback order changes apply

**Pass Criteria**: Settings saved and applied correctly

---

### ✅ Phase 9: Error Handling (10 min) 🔑 CRITICAL

- [ ] Network error shows message
- [ ] Timeout handled gracefully
- [ ] No URL → appropriate error
- [ ] Batch continues after item failure
- [ ] **No crashes or unhandled exceptions**

**Pass Criteria**: Graceful error handling, no crashes

---

### ✅ Phase 10: Performance (15 min) 🔑 CRITICAL

- [ ] Archive 50+ items without memory errors
- [ ] No "Not Responding" message
- [ ] Zotero stays responsive
- [ ] Batch completes successfully

**Pass Criteria**: Performance acceptable, Zotero responsive

---

### ✅ Phase 11: Data Integrity (10 min)

- [ ] Original metadata unchanged
- [ ] Archive URLs stored correctly
- [ ] Multiple archives per item tracked
- [ ] Export/import preserves data

**Pass Criteria**: Data unchanged and properly stored

---

### ✅ Phase 12: Stability (15 min) 🔑 CRITICAL

- [ ] No crashes or exceptions
- [ ] No memory leaks over 3+ batches
- [ ] Clear error messages
- [ ] **Console: "[Moment-o7] Uncaught promise rejection: ..." ← SHOULD NOT SEE**

**Pass Criteria**: Stable operation, no promise errors

---

## Critical Success Indicators

🔴 **MUST PASS** (Blocking):

- Phase 1: Plugin loads
- Phase 2: Basic archiving works
- Phase 9: Error handling (no crashes)
- Phase 10: Performance (responsive)
- Phase 12: Stability (no errors)

🟡 **SHOULD PASS** (High Priority):

- Phase 3: Concurrent batch
- Phase 4: Traffic monitoring
- Phase 5: Service jamming

---

## Debug Tips

### View Errors

```
Zotero Debug Console:
  Help → Debug Output Logging

Look for:
  ✅ [Moment-o7] Log messages
  ❌ Uncaught promises
  ❌ TypeError/ReferenceError
  ❌ Network errors
```

### Test Items

- Simple: Wikipedia, news articles
- Complex: JavaScript-heavy sites
- Various: PDFs, documents, images
- Mix: ~50% simple, 50% complex

### If Errors Occur

1. Note exact error message
2. Check Zotero Debug Console
3. Note which phase failed
4. Try again after Zotero restart
5. Document in testing report

---

## Testing Report Template

Save this as `FUNCTIONAL-TEST-REPORT.md`:

```markdown
# Functional Testing Report - Moment-o7

**Date**: [Date]
**Tester**: [Name]
**Zotero Version**: [Version]
**OS**: [macOS/Linux/Windows]

## Results

| Phase | Status            | Notes   |
| ----- | ----------------- | ------- |
| 1     | ✅ PASS / ❌ FAIL | [Notes] |
| 2     | ✅ PASS / ❌ FAIL | [Notes] |
| 3     | ✅ PASS / ❌ FAIL | [Notes] |
| ...   | ...               | ...     |

## Summary

- Total Phases: 12
- Passed: [X]
- Failed: [Y]
- Overall: ✅ READY / ⚠️ ISSUES / ❌ BLOCKED

## Issues Found

[List any bugs, crashes, or unexpected behavior]

## Performance

- Memory usage: [OK/HIGH]
- Response time: [OK/SLOW]
- Crashes: [None/Describe]

## Recommendation

[Ready to deploy / Fix issues / Retest]
```

---

## Success Checklist

- [ ] All 12 phases attempted
- [ ] 0 crashes observed
- [ ] 0 unhandled promise rejections
- [ ] No "Uncaught (in promise) undefined" errors
- [ ] UI responsive throughout
- [ ] Data integrity verified
- [ ] Performance acceptable
- [ ] Error messages clear

---

## Next Steps After Testing

**If all tests PASS** ✅:

1. Create testing report
2. Merge to main branch
3. Create GitHub release
4. Deploy to production

**If issues found** ❌:

1. Document exact errors
2. Check Zotero console logs
3. Note reproduction steps
4. Report findings for fixes

---

## Quick Commands

```bash
# Verify build is ready
ls -lh .scaffold/build/moment-o-7.xpi

# Open Zotero
open /Applications/Zotero.app

# View latest logs (after restart)
# Help → Debug Output Logging in Zotero

# After testing, run again to rebuild
npm run build

# Run unit tests (should all pass)
npm test
```

---

**Estimated Time**: 1-3 hours
**Risk Level**: LOW (read-only, no data modification)
**Ready to Start**: YES ✅
