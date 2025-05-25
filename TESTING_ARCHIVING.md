# Testing Archive Functions in Zotero Moment-o7

## Prerequisites

1. Install the plugin in Zotero 7:
   - Go to Tools → Add-ons
   - Click the gear icon → Install Add-on From File
   - Select `zotero-moment-o7.xpi`
   - Restart Zotero

2. Open the JavaScript console:
   - Tools → Developer → Run JavaScript

## Quick Test

1. Copy and paste the contents of `test-archiving.js` into the JavaScript console
2. Run: `await testArchiving()`

## Manual Testing Steps

### Test 1: Automatic Archiving on Item Creation

1. Open Zotero with the Error Console visible (Tools → Developer → Error Console)
2. Add a new web page item via the Browser Connector
3. Check the Error Console for "Archiving item:" messages
4. After a few seconds, check the item's:
   - Extra field (should contain "Archived:")
   - Notes (should have a new note with the archived URL)

### Test 2: Internet Archive Menu

1. Select an item with a URL in your library
2. Right-click → "Archive this Resource" → "Internet Archive"
3. Wait for the notification (bottom right)
4. Check:
   - Extra field updated with "Archived: [URL]"
   - New note created with robust link HTML

### Test 3: Archive.today Menu

1. Select an item with a URL
2. Right-click → "Archive this Resource" → "Archive.today"
3. Wait for the notification
4. Check:
   - Extra field updated with "Archive.today: [URL]"
   - New note created with robust link

### Test 4: Create Robust Link (All Archives)

1. Select an item with a URL
2. Right-click → "Archive this Resource" → "Create Robust Link (All Archives)"
3. Wait for both archives to complete
4. Check:
   - New attachment created: "Robust Link for [title]"
   - Attachment contains HTML with links to both archives
   - Extra field has both archive URLs

### Test 5: Export Translators

1. Select items with archived URLs
2. Export using:
   - BibLaTex format (should include archived URLs)
   - MLA with Archived format
   - HTML Snippet format
   - Wikipedia Citation Template
3. Verify exported citations include archive information

## Expected Results

### Successful Internet Archive
- Extra field: `Archived: https://web.archive.org/web/[timestamp]/[original-url]`
- Note with robust link HTML snippet

### Successful Archive.today
- Extra field: `Archive.today: https://archive.today/[hash]`
- Note with robust link HTML snippet

### Successful Robust Link
- HTML attachment with both archive links
- Extra field with both URLs
- Formatted HTML ready for copy/paste

## Troubleshooting

### If Internet Archive fails:
- Check internet connection
- Try the URL directly at https://web.archive.org/save/
- Check Error Console for specific errors

### If Archive.today fails:
- Verify Cloudflare Worker is deployed
- Check proxy URL in ArchiveTodayPusher.js
- Test proxy directly: 
  ```bash
  curl -X POST https://zotero-archive-proxy.2pc9prprn5.workers.dev \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com"}'
  ```

### If menu items don't appear:
- Restart Zotero
- Check Error Console for loading errors
- Verify plugin is enabled in Tools → Add-ons

## Debug Mode

To enable verbose logging:
1. In JavaScript console: `Zotero.Prefs.set('extensions.zotero.debug.log', true)`
2. Restart Zotero
3. Check Error Console for detailed logs