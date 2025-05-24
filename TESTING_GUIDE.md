# Zotero Moment-o7 Testing Guide

## Prerequisites

1. **Install Zotero 7 Beta**
   - Download from: https://www.zotero.org/support/beta_builds
   - Use a separate profile for testing (recommended)

2. **Install the Plugin**
   - Build: `./scripts/build.sh`
   - In Zotero: Tools → Add-ons → Gear icon → Install Add-on From File
   - Select `zotero-moment-o7.xpi`
   - Restart Zotero

3. **Open Developer Tools**
   - Tools → Developer → Error Console (to monitor for errors)
   - Tools → Developer → Run JavaScript (for testing)

## Core Functionality Tests

### 1. Test Automatic Archiving

**Steps:**
1. Open Zotero with the plugin installed
2. Use the Zotero Browser Connector to save a webpage
3. Check the saved item in your library

**Expected Results:**
- [ ] Item saves successfully
- [ ] "Extra" field contains archived URL (may take 10-30 seconds)
- [ ] A note is attached with a "Robust Link"
- [ ] Item has "archived" tag
- [ ] No errors in console

**Test URLs:**
- https://en.wikipedia.org/wiki/Zotero (should archive quickly)
- https://www.zotero.org/support/quick_start_guide
- A news article from a major news site

### 2. Test Manual Archiving

**Steps:**
1. Select an item in your library that has a URL
2. Right-click on the item
3. Select "Archive this Resource" → "Internet Archive"

**Expected Results:**
- [ ] Progress notification appears: "Archiving... This may take a while..."
- [ ] Success notification: "Success! Archived to Internet Archive."
- [ ] Archived URL added to "Extra" field
- [ ] Note created with robust link
- [ ] "archived" tag added

### 3. Test Multiple Item Archiving

**Steps:**
1. Select multiple items with URLs (Ctrl/Cmd+click)
2. Right-click → "Archive this Resource" → "Internet Archive"

**Expected Results:**
- [ ] Each item is archived sequentially
- [ ] Each gets its own archived URL and note
- [ ] Progress shown for each item

### 4. Test Error Handling

**Test Invalid URL:**
1. Create a test item with invalid URL (e.g., "not-a-url")
2. Try to archive it

**Expected:**
- [ ] No crash
- [ ] Item skipped silently or error notification

**Test Already Archived:**
1. Try to archive an item that already has "archived" tag

**Expected:**
- [ ] Item is skipped (no duplicate archiving)

### 5. Test ORCID Extraction (Signposting)

**Steps:**
1. Save an academic article from a journal that supports Signposting
2. Check for ORCID attachments

**Expected (if supported by site):**
- [ ] ORCID profiles attached as linked URLs
- [ ] Author names extracted correctly

### 6. Test Plugin Load/Unload

**Load Test:**
1. Check Tools → Add-ons
2. Verify plugin shows as enabled

**Unload Test:**
1. Disable plugin in Add-ons
2. Restart Zotero
3. Verify menu item is gone

**Re-enable Test:**
1. Enable plugin again
2. Verify functionality returns

## Console Checks

While testing, monitor the Error Console for:

### Expected Messages:
```
Zotero Moment-o7: Starting Moment-o7 version 2.0.0
Zotero Moment-o7: Initializing Zotero Moment-o7 v2.0.0
Zotero Moment-o7: Notifier registered with ID: [number]
Zotero Moment-o7: Adding to window
```

### Error Messages to Watch For:
- Any JavaScript errors mentioning "moment-o7"
- "TypeError" messages related to our files
- Failed network requests to web.archive.org

## Performance Testing

### Memory Leak Test:
1. Open and close multiple Zotero windows
2. Archive many items
3. Check memory usage doesn't continuously grow

### Bulk Archive Test:
1. Select 10+ items
2. Archive them all
3. Verify no timeouts or hangs

## Export Translator Tests

### Test Enhanced Translators:
1. Select archived items
2. Export using:
   - BibLaTeX (includes archived URLs)
   - MLA (includes archival metadata)  
   - HTML Snippet/Robust Links
   - Bookmarks
   - Wikipedia Citation Template

**Expected:**
- [ ] Exported data includes archival information
- [ ] Format is valid for each export type

## Debugging Commands

In Tools → Developer → Run JavaScript:

```javascript
// Check if plugin is loaded
Zotero.MomentO7

// Check version
Zotero.MomentO7.version

// Test archiving directly
var item = Zotero.getActiveZoteroPane().getSelectedItems()[0];
await Zotero.IaPusher.archiveItem(item);

// Check notifier
Zotero.MomentO7.notifierID
```

## Common Issues and Solutions

### Plugin Not Loading:
1. Check Error Console for startup errors
2. Verify correct Zotero version (7.0+)
3. Try removing and reinstalling

### Archiving Fails:
1. Check internet connection
2. Verify web.archive.org is accessible
3. Check if URL is valid HTTP/HTTPS

### Menu Not Appearing:
1. Right-click on an item (not a collection)
2. Try restarting Zotero
3. Check if plugin is enabled

## Test Checklist Summary

- [ ] Automatic archiving works
- [ ] Manual archiving works
- [ ] Multiple selection works
- [ ] Error handling is graceful
- [ ] Plugin loads/unloads cleanly
- [ ] No memory leaks
- [ ] Export translators include archive data
- [ ] Console shows expected messages
- [ ] No JavaScript errors

## Reporting Issues

When reporting issues, include:
1. Zotero version (Help → About Zotero)
2. Plugin version (Tools → Add-ons)
3. Error Console output
4. Steps to reproduce
5. Expected vs actual behavior