# Functional Testing Checklist for Moment-o7

Before pushing changes, complete this functional testing checklist by installing the plugin in Zotero and verifying the features work correctly.

## Prerequisites

- Zotero 7 installed locally
- Built plugin: `.scaffold/build/moment-o-7.xpi`
- Sample items to archive (at least 5-10 items with different URLs)

## Quick Start

```bash
npm run build                  # Generate .xpi
# Install .scaffold/build/moment-o-7.xpi in Zotero
```

## Testing Phases

### Phase 1: Plugin Loads ✓
- [ ] Plugin appears in Tools menu
- [ ] Context menu shows "Archive this Resource"
- [ ] Preferences open without errors
- [ ] No console errors on startup

### Phase 2: Single Item Archiving ✓
- [ ] Archive item to Internet Archive
- [ ] Archive item to Archive.today
- [ ] Archived URL saved to metadata
- [ ] Item extra field contains archive URL
- [ ] Error handling for items with no URL

### Phase 3: Concurrent Batch (NEW) ✓
- [ ] Select 10+ items
- [ ] Right-click → Archive this Resource
- [ ] Progress window shows multi-item status
- [ ] Window displays progress: "Archiving (X/10)"
- [ ] Items process in parallel (some complete before others)
- [ ] All results returned in original order
- [ ] Final message shows count: "Complete: X archived, Y failed"

### Phase 4: Traffic Monitoring (NEW) ✓
- [ ] During batch archiving, progress header shows traffic data
- [ ] Example display: "Archiving (5/10) | IA: 0.8"
- [ ] Slow requests (>1s) contribute to traffic score
- [ ] Fast requests (<1s) don't contribute

### Phase 5: Service Jamming (NEW) ✓
- [ ] Multiple slow requests to same service
- [ ] Service marked as "jammed" when score ≥ 2.0
- [ ] Progress shows: "IA: JAMMED"
- [ ] Jammed services filtered from fallback

### Phase 6: Fallback Chain ✓
- [ ] Select items, configure fallback order
- [ ] Archive with "Create Robust Link (All Archives)"
- [ ] Some items use first service, others use fallback
- [ ] All items get archived successfully

### Phase 7: Robust Links ✓
- [ ] Archived items have note with link
- [ ] Note includes: date, service name, HTML code
- [ ] HTML includes data attributes (originalurl, versionurl, versiondate)

### Phase 8: Preferences ✓
- [ ] Auto-archive toggle works
- [ ] Default service selection persists
- [ ] Fallback order changes apply
- [ ] API keys saved securely

### Phase 9: Error Handling ✓
- [ ] Network errors show appropriate message
- [ ] Service timeouts handled gracefully
- [ ] Item with no URL rejected properly
- [ ] Batch continues after individual item failure

### Phase 10: Performance ✓
- [ ] Archive 50+ items: no memory errors
- [ ] Long-running batch: no "Not Responding"
- [ ] Zotero remains responsive during archiving
- [ ] Batch completes successfully

### Phase 11: Data Integrity ✓
- [ ] Original item metadata preserved
- [ ] Archive URLs stored correctly in extra field
- [ ] Multiple archives per item tracked separately
- [ ] Export/import preserves archive data

### Phase 12: Stability ✓
- [ ] No crashes or unhandled exceptions
- [ ] No memory leaks over multiple batches
- [ ] Clear error messages when failures occur

## Sign-Off

- [ ] All 12 phases completed
- [ ] No crashes observed
- [ ] UI responsive throughout
- [ ] Data integrity maintained

**Ready to push**: ✅ YES / ❌ NO

---

**Notes for Tester**:
- Each phase should take 10-15 minutes
- Total testing time: ~2-3 hours
- If any test fails, document the issue and don't push
- Build fresh XPI before each test session
