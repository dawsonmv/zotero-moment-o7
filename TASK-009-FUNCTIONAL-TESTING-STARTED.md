# TASK-009: Functional Testing - STARTED

**Status:** 🔄 IN PROGRESS
**Started:** 2026-01-02 00:30 UTC
**Estimated Duration:** 1-3 hours
**Tester:** [Your Name]

---

## 📋 Task Summary

**Objective:** Complete 12-phase functional testing in Zotero 7 to verify plugin works correctly before production deployment.

**Critical Gate:** This is the final gate before merge to main and production release.

**Success Criteria:**
- ✅ All 5 critical phases pass (1, 2, 9, 10, 12)
- ✅ Zero crashes or unhandled promise rejections
- ✅ Data integrity verified
- ✅ Performance acceptable

---

## 📂 Testing Documentation

### Quick Start
**Read First:** `TESTING-QUICK-START.md`
- TL;DR overview
- Step-by-step installation
- Phase summary table
- 15-minute quick test option

### Detailed Checklist
**During Testing:** `FUNCTIONAL-TEST-CHECKLIST.md`
- Complete 12-phase breakdown
- Pass criteria for each phase
- Debug tips and error patterns
- Issue logging template
- Final results summary

### Quick Reference
**While Testing:** `FUNCTIONAL-TEST-QUICK-REFERENCE.md`
- 5-minute summaries per phase
- Critical success indicators
- Debug console commands
- Emergency troubleshooting

---

## 🚀 Getting Started

### Step 1: Prepare
```bash
# Verify XPI is built
ls -lh .scaffold/build/moment-o-7.xpi

# Expected: -rw-rw-rw-@ ... 79K ... moment-o-7.xpi
```

### Step 2: Install
```bash
# Open Zotero
open /Applications/Zotero.app

# Then in Zotero:
# Tools → Add-ons → ⚙️ → "Install Add-on From File..."
# Select: .scaffold/build/moment-o-7.xpi
# Restart when prompted
```

### Step 3: Test
```bash
# Open FUNCTIONAL-TEST-CHECKLIST.md
# Follow 12 phases
# Mark ✅/❌ as you complete each
```

---

## 📊 Testing Phases Overview

### Critical Phases (MUST PASS)
| Phase | Name | Time | Focus |
|-------|------|------|-------|
| 1 | Plugin Loads | 5min | UI visible, no errors |
| 2 | Single Archiving | 15min | Basic functionality works |
| 9 | Error Handling | 10min | **NO crashes, clear errors** |
| 10 | Performance | 15min | 50+ items, responsive |
| 12 | Stability | 15min | Multiple batches, **ZERO promise errors** |

### High Priority Phases (SHOULD PASS)
| Phase | Name | Time |
|-------|------|------|
| 3 | Concurrent Batch | 10min |
| 4 | Traffic Monitoring | 10min |
| 5 | Service Jamming | 10min |
| 6 | Fallback Chain | 10min |

### Standard Phases (NICE TO HAVE)
| Phase | Name | Time |
|-------|------|------|
| 7 | Robust Links | 10min |
| 8 | Preferences | 10min |
| 11 | Data Integrity | 10min |

---

## 🎯 What to Watch For

### Phase 1: Plugin Loads
- ✅ Tools menu shows "Archive with Momento7"
- ✅ Right-click context menu visible
- ✅ Preferences dialog opens
- ❌ NO console errors on startup

### Phase 2: Single Archiving
- ✅ Archive single item succeeds
- ✅ Archive URL saved to metadata
- ✅ Extra field updated
- ✅ Error message for missing URL
- ❌ NO type errors or crashes

### Phase 9: Error Handling 🔴 CRITICAL
**Look for in Debug Console:**
```
❌ MUST NOT see:
  "Uncaught (in promise) undefined"
  "TypeError: Cannot read..."
  "[Moment-o7]" ERROR messages

✅ Should see:
  "[Moment-o7]" INFO messages
  Clear error dialogs
  Batch continues after failure
```

### Phase 10: Performance 🔴 CRITICAL
```
✅ 50 items should:
  - Complete successfully
  - Take <5 minutes
  - Keep Zotero responsive
  - Show no "Not Responding"

❌ Should NOT:
  - Hang or freeze
  - Show excessive memory growth
  - Crash
  - Slow down UI
```

### Phase 12: Stability 🔴 CRITICAL
```
✅ Multiple batches should:
  - All complete successfully
  - Show consistent performance
  - Have NO promise errors
  - Keep memory stable

❌ CRITICAL FAILURE if:
  "[Moment-o7] Uncaught promise rejection: ..."
  appears in debug console
```

---

## 🔍 Debug Console Quick Commands

**Open it:**
```
Help → Debug Output Logging
```

**Monitor in real-time:**
- Watch for `[Moment-o7]` messages
- Search for `Uncaught` (should find 0)
- Search for `TypeError` (should find 0)
- Search for `promise` (only "promise" parts of normal names OK)

**Critical Patterns:**
```
FAIL: "Uncaught (in promise) undefined"
FAIL: "Uncaught promise rejection:"
FAIL: "TypeError:"
FAIL: "[Moment-o7]" with ERROR level

OK: "[Moment-o7]" with DEBUG/INFO level
OK: "Failed to fetch..." with proper error handling
OK: Progress messages and archive completions
```

---

## 📝 Issue Template

If you find a problem, document it like this:

```
**Issue #[N]:**
- Phase: [1-12]
- Title: [Brief description]
- Steps to Reproduce:
  1. [First step]
  2. [Second step]
  3. [...]
- Expected: [What should happen]
- Actual: [What happened instead]
- Severity: Critical/High/Medium/Low
- Debug Output: [Copy relevant error if any]
- Screenshot: [If helpful]
```

---

## ⏱️ Time Estimates

```
Quick Test (critical phases only):  30-45 min
Standard Test (all 12 phases):      1.5-2 hours
Complete Test (with retesting):     2-3 hours
```

**Recommend:** Full testing (all 12 phases) for thorough validation

---

## ✅ Success Checklist

**Before Declaring Complete:**
- [ ] Phase 1 PASS: Plugin loads
- [ ] Phase 2 PASS: Single archiving works
- [ ] Phase 9 PASS: No crashes, clear errors
- [ ] Phase 10 PASS: 50+ items, responsive
- [ ] Phase 12 PASS: Multiple batches, zero promise errors
- [ ] Debug console: ZERO red errors
- [ ] FUNCTIONAL-TEST-CHECKLIST.md fully filled in
- [ ] All issues (if any) documented

---

## 🎓 Key Files Reference

```
.scaffold/build/moment-o-7.xpi     ← Plugin to install (79 KB)
TESTING-QUICK-START.md              ← Read this first (TL;DR)
FUNCTIONAL-TEST-CHECKLIST.md        ← Fill this out during testing
FUNCTIONAL-TEST-QUICK-REFERENCE.md  ← Use this for quick lookup
run-functional-tests.sh             ← Helper script
```

---

## 🚨 If Critical Failures Found

**Don't continue testing. Stop and:**
1. Document the exact issue
2. Copy error message/stack trace
3. Note reproduction steps
4. Report to development team
5. Return to code for fixing

**Critical failures = Blocking issues:**
- Phase 1: Plugin won't load
- Phase 2: Archiving broken
- Phase 9: Crash/unhandled error
- Phase 10: Performance unacceptable
- Phase 12: Promise rejection error

---

## 🎉 Next Steps After Testing

### If All Tests Pass ✅
1. Complete `FUNCTIONAL-TEST-CHECKLIST.md`
2. Create GitHub issue: "TASK-009: Functional Testing Complete"
3. Merge `feature/archive-service-config-ui` to `main`
4. Tag release: `v1.0.0`
5. Deploy to production

### If Issues Found ❌
1. Document each issue in checklist
2. Create GitHub issues for blocking items
3. Return to development
4. Fix and rebuild plugin
5. Schedule re-testing

---

## 📞 Resources

**Zotero Documentation:**
- https://www.zotero.org/support/

**Plugin Installation Help:**
- https://www.zotero.org/support/plugins

**Debug Console Guide:**
- In Zotero: Help → Debug Output Logging

**This Project:**
- Repository: https://github.com/[user]/zotero-momento7-new
- Issue Tracker: Same repo

---

## 📋 Testing Log

**Started:** 2026-01-02 [TIME]
**Tester:** [NAME]

### Progress
- [ ] Setup complete
- [ ] Plugin installed
- [ ] Phase 1 tested
- [ ] Phase 2 tested
- [ ] Phase 3 tested
- [ ] Phase 4 tested
- [ ] Phase 5 tested
- [ ] Phase 6 tested
- [ ] Phase 7 tested
- [ ] Phase 8 tested
- [ ] Phase 9 tested
- [ ] Phase 10 tested
- [ ] Phase 11 tested
- [ ] Phase 12 tested
- [ ] Results compiled

**Completed:** 2026-01-02 [TIME]
**Total Time:** [HOURS]

---

**Status:** Ready to begin testing! 🚀

**Follow:** TESTING-QUICK-START.md for step-by-step guidance
