# Zotero Moment-o7 Test Checklist

## Pre-Test Setup
- [ ] Build the plugin: `npm run build`
- [ ] Install in Zotero 7: Tools → Add-ons → Install from file → Select `zotero-moment-o7.xpi`
- [ ] Restart Zotero
- [ ] Open Error Console: Tools → Developer → Error Console

## Basic Functionality Tests

### 1. Plugin Loading
- [ ] Check Error Console for "Initializing Zotero Moment-o7" message
- [ ] Right-click any item → Verify "Archive this Resource" menu appears
- [ ] Menu should contain:
  - [ ] Internet Archive
  - [ ] Archive.today
  - [ ] Create Robust Link (All Archives)

### 2. Internet Archive Tests
- [ ] Select item with normal URL (e.g., news article)
- [ ] Archive → Internet Archive
- [ ] ✅ Should show success notification
- [ ] ✅ Check item's Extra field for "Archived: https://web.archive.org/..."
- [ ] ✅ Check for new note with robust link HTML

### 3. Archive.today Tests
- [ ] Select item with normal URL
- [ ] Archive → Archive.today
- [ ] ✅ Should show progress window
- [ ] ✅ Check Extra field for "Archive.today: https://archive.today/..."
- [ ] ✅ Check for new note with robust link HTML

### 4. Robust Link Tests
- [ ] Select item with URL
- [ ] Archive → Create Robust Link (All Archives)
- [ ] ✅ Should show progress for both services
- [ ] ✅ Should create "Robust Link" attachment
- [ ] ✅ Attachment should contain both archive URLs

## Error Handling Tests

### 5. Publisher Blocking (HTTP 523)
- [ ] Add JSTOR article: https://www.jstor.org/stable/[any-id]
- [ ] Archive → Internet Archive
- [ ] ❌ Should show: "This site cannot be archived (blocked by publisher)"
- [ ] ❌ NOT: "HTTP GET failed with status code 523"

### 6. Rate Limiting (HTTP 429)
- [ ] Archive 5+ items rapidly to Internet Archive
- [ ] ❌ Should eventually show: "Archive service is rate limiting. Please wait a few minutes and try again"
- [ ] ❌ NOT: "HTTP 429 Too Many Requests"

### 7. Invalid URL (HTTP 404)
- [ ] Create webpage item with URL: https://nonexistent.example.com/404
- [ ] Archive → Internet Archive
- [ ] ❌ Should show: "The URL could not be found"

### 8. Archive.today Errors
- [ ] Archive many items rapidly to Archive.today
- [ ] ❌ Should show: "Rate limited - try again later"
- [ ] Try archiving JSTOR to Archive.today
- [ ] ❌ May show: "Site blocks archiving"

## Automatic Archiving Tests

### 9. Auto-Archive on Item Creation
- [ ] Enable browser connector
- [ ] Save any webpage to Zotero
- [ ] Check Error Console for "Archiving item:" message
- [ ] ✅ Item should be automatically archived to Internet Archive
- [ ] ✅ Extra field should be updated

### 10. Skip Already Archived
- [ ] Select item that's already archived
- [ ] Try to archive again
- [ ] Should skip with appropriate message

## Edge Cases

### 11. Items Without URLs
- [ ] Select book/journal article without URL
- [ ] Archive menu should work but skip the item

### 12. Multiple Selection
- [ ] Select 3+ items with URLs
- [ ] Archive to any service
- [ ] All should be processed with individual status

### 13. Mixed Selection
- [ ] Select mix of items (some with URLs, some without)
- [ ] Archive to any service
- [ ] Only items with URLs should be processed

## Export Translator Tests

### 14. BibLaTeX Export
- [ ] Select archived items
- [ ] Export → BibLaTeX
- [ ] ✅ Should include archived URLs in export

### 15. MLA with Archived Export
- [ ] Select archived items
- [ ] Export → MLA with Archived
- [ ] ✅ Should include "Archived at" information

## Performance Tests

### 16. Large Batch
- [ ] Select 10+ items
- [ ] Create Robust Links
- [ ] Should handle gracefully with progress updates

### 17. Timeout Handling
- [ ] Archive very slow loading site
- [ ] Should timeout with message: "Archive request timed out"

## Cloudflare Worker Tests

### 18. Worker Status
- [ ] In browser, visit: https://zotero-archive-proxy.2pc9prprn5.workers.dev/?url=https://example.com
- [ ] Should return JSON with archive URL

### 19. Worker Error Messages
- [ ] Test worker with blocked site
- [ ] Should return specific error messages

## Post-Test Verification

### 20. Console Errors
- [ ] Check Error Console for any uncaught errors
- [ ] All errors should have user-friendly messages

### 21. Data Integrity
- [ ] Verify archived URLs are accessible
- [ ] Check that Extra field formatting is consistent
- [ ] Ensure notes contain valid HTML

## Test Summary
- Total Tests: 21
- Basic Functions: ___/4
- Error Handling: ___/4
- Auto Features: ___/2
- Edge Cases: ___/3
- Translators: ___/2
- Performance: ___/2
- Worker: ___/2
- Verification: ___/2

## Notes
- Rate limiting resets after 5-10 minutes
- JSTOR consistently blocks Internet Archive
- Archive.today may be slow during peak hours
- Some academic publishers block all archiving services