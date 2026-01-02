# Functional Testing Quick Start Guide

**⏱️ Time Estimate:** 1-3 hours
**📊 Test Coverage:** 12 phases, 5 critical tests
**✅ Success Criteria:** All critical phases pass, zero promise errors

---

## 🎯 TL;DR - Start Testing Now

### Step 1: Copy Plugin Path

```bash
# This is the plugin file you'll install
.scaffold/build/moment-o-7.xpi
```

### Step 2: Open Zotero

```bash
open /Applications/Zotero.app
```

### Step 3: Install Plugin

1. **Tools** → **Add-ons** → **⚙️ Gear Icon**
2. Select **"Install Add-on From File..."**
3. Choose: `.scaffold/build/moment-o-7.xpi`
4. Click **"Install"**
5. **Restart** when prompted

### Step 4: Verify Installation

- ✅ Tools menu has "Archive with Momento7"
- ✅ Right-click item shows "Archive this Resource"
- ✅ Preferences dialog opens
- ✅ No console errors

### Step 5: Start Testing

- Open `FUNCTIONAL-TEST-CHECKLIST.md`
- Follow 12 testing phases
- Mark ✅/❌ for each phase
- Document any issues

---

## 📋 Quick Phase Overview

| Phase | Name               | Time  | Critical? | Quick Test             |
| ----- | ------------------ | ----- | --------- | ---------------------- |
| 1     | Plugin Loads       | 5min  | 🔴 YES    | Check UI, no errors    |
| 2     | Single Archiving   | 15min | 🔴 YES    | Archive 1 item         |
| 3     | Batch Archiving    | 10min | 🟡 HIGH   | Archive 10 items       |
| 4     | Traffic Monitoring | 10min | 🟡 HIGH   | Watch traffic scores   |
| 5     | Service Jamming    | 10min | 🟡 HIGH   | Trigger jamming        |
| 6     | Fallback Chain     | 10min | 🟡 HIGH   | Test multiple services |
| 7     | Robust Links       | 10min | 🟢 MED    | Check archive notes    |
| 8     | Preferences        | 10min | 🟢 MED    | Change settings        |
| 9     | Error Handling     | 10min | 🔴 YES    | Test error messages    |
| 10    | Performance        | 15min | 🔴 YES    | Archive 50 items       |
| 11    | Data Integrity     | 10min | 🟢 MED    | Verify metadata        |
| 12    | Stability          | 15min | 🔴 YES    | Multiple batches       |

**Critical Tests (MUST PASS):** 1, 2, 9, 10, 12

---

## 🚀 Testing Workflow

### Before Each Phase:

1. Read the phase description
2. Note the pass criteria
3. Prepare test data if needed
4. Set up debug console if using

### During Each Phase:

1. Follow the steps listed
2. Observe expected behavior
3. Check for errors
4. Take notes on any issues
5. Mark ✅ PASS or ❌ FAIL

### After Each Phase:

1. Record result in checklist
2. If FAIL: Document issue details
3. If PASS: Move to next phase
4. Critical failures → Stop and document

---

## 🔍 Key Things to Watch For

### Phase 1-2: Basic Functionality

- Plugin menu items visible
- No startup errors
- Single item archives successfully
- Metadata saved correctly

### Phase 3-6: Concurrency & Services

- Multiple items process simultaneously
- Traffic monitoring shows scores
- Service jamming detected (score >= 2.0)
- Fallback services work

### Phase 7-8: Features & Settings

- Archive notes have correct format
- Preferences persist after restart

### Phase 9: 🔴 CRITICAL - Error Handling

**MUST NOT see these in debug console:**

```
❌ "Uncaught (in promise) undefined"
❌ "TypeError"
❌ "ReferenceError"
❌ "[Moment-o7]" error messages
```

Errors should be:

```
✅ "[Moment-o7]" info/debug messages
✅ Clear user-facing error dialogs
✅ Batch continues after item failure
```

### Phase 10: 🔴 CRITICAL - Performance

- Zotero stays responsive during archiving
- No "Not Responding" message
- Memory usage doesn't spike excessively
- 50+ items complete successfully

### Phase 12: 🔴 CRITICAL - Stability

- Multiple batches run without crashes
- No degradation over repeated use
- Promise errors: **ZERO**
- Memory: Stable

---

## 🛠️ Debug Console

### Open It:

```
Help → Debug Output Logging
```

### What to Look For:

**✅ Good:**

```
[Moment-o7] Archiving item: https://example.com
[Moment-o7] Successfully archived to Internet Archive
[Moment-o7] Archive URL saved to metadata
```

**❌ Bad:**

```
Uncaught (in promise) undefined
TypeError: Cannot read property 'getField'
[Moment-o7] Uncaught promise rejection: ...
```

### Search Tips:

- Search for `[Moment-o7]` to find plugin messages
- Search for `Uncaught` to find unhandled errors
- Search for `TypeError` to find type errors
- Watch output as you test

---

## 📝 Logging Issues

### For Each Issue Found:

1. **What phase?** (1-12)
2. **What happened?** (clear description)
3. **How to reproduce?** (steps)
4. **Expected behavior?** (what should happen)
5. **Actual behavior?** (what did happen)
6. **Severity?** (Critical/High/Medium/Low)
7. **Error message?** (if any)
8. **Screenshot?** (if helpful)

**Example:**

```
Phase 9: Error Handling
Issue: Promise rejection error in console
Steps: Archive item, wait for completion, check console
Expected: Clear user message, batch continues
Actual: "Uncaught (in promise) undefined" in console
Severity: CRITICAL
Error: Uncaught (in promise) undefined at ConcurrentArchiveQueue.ts:96
```

---

## ✅ Success Criteria

### Minimum (Must Have)

- [ ] Phase 1 PASS: Plugin loads
- [ ] Phase 2 PASS: Single archiving works
- [ ] Phase 9 PASS: No crashes, clear errors
- [ ] Phase 10 PASS: Performance OK
- [ ] Phase 12 PASS: Stability OK (0 promise errors)

### Optimal (Should Have)

- [ ] All 12 phases PASS
- [ ] 0 issues found
- [ ] Clean debug console (no red errors)
- [ ] Memory usage stable
- [ ] All data correctly stored

---

## 📊 Quick Checklist

```
SETUP:
☐ Zotero 7 installed
☐ XPI file exists at .scaffold/build/moment-o-7.xpi
☐ Test items ready (10-50 with URLs)
☐ Debug console available

INSTALLATION:
☐ Zotero opened
☐ Plugin installed
☐ Plugin verified in UI
☐ No startup errors

TESTING:
☐ Phase 1: Plugin Loads ✅/❌
☐ Phase 2: Single Item ✅/❌
☐ Phase 3: Batch (10 items) ✅/❌
☐ Phase 4: Traffic Monitoring ✅/❌
☐ Phase 5: Service Jamming ✅/❌
☐ Phase 6: Fallback Chain ✅/❌
☐ Phase 7: Robust Links ✅/❌
☐ Phase 8: Preferences ✅/❌
☐ Phase 9: Error Handling ✅/❌
☐ Phase 10: Performance (50 items) ✅/❌
☐ Phase 11: Data Integrity ✅/❌
☐ Phase 12: Stability (multiple batches) ✅/❌

VERIFICATION:
☐ All critical phases passed
☐ Zero promise rejection errors
☐ Zero crashes
☐ Performance acceptable
☐ Data intact
```

---

## 🎁 Test Data Tips

### Minimal Test (15 min)

- 5 simple URLs (news articles, wiki)
- Test phases 1, 2, 9

### Standard Test (1.5 hours)

- 15-20 mixed items
- Phases 1-8, 9, 11-12

### Complete Test (3 hours)

- 50+ items, variety of content
- All 12 phases
- Repeat batches for stability

### Test Item Ideas

```
Simple (fast to archive):
- https://en.wikipedia.org/wiki/Zotero
- https://www.example.com
- https://github.com/anthropics/claude-code

Complex (JavaScript-heavy):
- https://github.blog/...
- https://news.ycombinator.com
- https://twitter.com

With DOI:
- Search "site:scholar.google.com" for academic papers
```

---

## 🚨 Critical Failure Points

If any of these occur → **STOP TESTING**, Document, Report:

1. **🔴 Phase 1 FAIL:** Plugin doesn't load
2. **🔴 Phase 2 FAIL:** Basic archiving broken
3. **🔴 Phase 9 FAIL:** Crash or unhandled promise error
4. **🔴 Phase 10 FAIL:** 50-item batch fails or Zotero unresponsive
5. **🔴 Phase 12 FAIL:** Promise rejection error appears

Any of these = **CRITICAL ISSUE** requiring developer attention before merge.

---

## 📞 Need Help?

**If stuck:**

1. Check the debug console (Help → Debug Output Logging)
2. Restart Zotero and try again
3. Review the phase description in FUNCTIONAL-TEST-CHECKLIST.md
4. Document what you tried
5. Report findings

**Key Files:**

- **Checklist:** `FUNCTIONAL-TEST-CHECKLIST.md`
- **Quick Reference:** `FUNCTIONAL-TEST-QUICK-REFERENCE.md`
- **Installation Help:** `run-functional-tests.sh`

---

## ⏰ Time Budget

```
Setup & Installation:     10-15 min
Phase 1 (Loads):          5 min
Phase 2 (Single):         15 min
Phase 3-4 (Batch/Traffic): 20 min
Phase 5-6 (Jamming/Fallback): 20 min
Phase 7-8 (Links/Prefs):  20 min
Phase 9 (Errors):         10 min
Phase 10 (Performance):   15 min
Phase 11-12 (Data/Stable): 25 min

TOTAL: 1-2.5 hours

With retesting/debugging: 2-3 hours
```

---

## 🎉 Ready to Start?

1. Open Zotero: `open /Applications/Zotero.app`
2. Install plugin from: `.scaffold/build/moment-o-7.xpi`
3. Follow: `FUNCTIONAL-TEST-CHECKLIST.md`
4. Track results: Check boxes ✅/❌
5. Document issues: Use issue template
6. Report results when done

**Let's go!** 🚀
