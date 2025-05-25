# Enhanced Error Handling

## Overview

The plugin now provides user-friendly error messages when archiving fails, instead of showing technical error codes.

## Error Messages

### Internet Archive (IaPusher.js)

| Error Code | User Message |
|------------|--------------|
| 523 | "This site cannot be archived (blocked by publisher)" |
| 429 | "Archive service is rate limiting. Please wait a few minutes and try again" |
| 403 | "Access denied - this site blocks archiving services" |
| 404 | "The URL could not be found" |
| 500+ | "Archive service is temporarily unavailable" |
| Timeout | "Archive request timed out - the site may be slow or blocking archiving" |

### Archive.today (ArchiveTodayPusher.js)

| Error Type | User Message |
|------------|--------------|
| Contains "blocked" or "403" | "Site blocks archiving" |
| Contains "rate" or "429" | "Rate limited - try again later" |
| Contains "timeout" | "Request timed out" |
| Contains "already archived" | "Already archived" |

### Cloudflare Worker (archive-proxy.js)

The proxy now returns specific error messages:
- "Cannot connect to Archive.today service"
- "Archive.today is rate limiting requests. Please try again later"
- "This site is blocked from archiving"
- "Archive request timed out"

## Testing Error Messages

1. **Test with a blocking site (e.g., JSTOR)**:
   - Select a JSTOR article
   - Try to archive it
   - Should see: "This site cannot be archived (blocked by publisher)"

2. **Test rate limiting**:
   - Archive multiple items rapidly
   - Should eventually see: "Archive service is rate limiting..."

3. **Test with invalid URL**:
   - Create an item with URL "https://nonexistent.example.com"
   - Try to archive
   - Should see: "The URL could not be found"

## User Experience

Instead of seeing technical errors like:
```
Archive failed: HTTP GET https://web.archive.org/save/... failed with status code 523
```

Users now see:
```
This site cannot be archived (blocked by publisher)
```

This makes it clear when the issue is with the target site rather than the plugin.