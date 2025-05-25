# New Archiving Services Guide

## Overview of Available Services

### Currently Active
1. **Internet Archive** - Free, unlimited archiving
2. **Archive.today** - Free, rate-limited archiving via proxy
3. **Robust Links** - Combined archives from both services

### Ready to Activate
1. **Perma.cc** - Academic-focused permanent archives (10 free/month)
2. **Memento Checker** - Find existing archives across all services

## Error Handling Summary

### Internet Archive Errors
- **523**: "This site cannot be archived (blocked by publisher)"
- **429**: "Archive service is rate limiting. Please wait a few minutes"
- **403**: "Access denied - this site blocks archiving services"
- **404**: "The URL could not be found"
- **500+**: "Archive service is temporarily unavailable"
- **Timeout**: "Archive request timed out"

### Archive.today Errors (via Cloudflare Worker)
- **Rate limiting**: "Rate limited - try again later"
- **Site blocking**: "Site blocks archiving"
- **Timeout**: "Request timed out"
- **Already archived**: "Already archived"

### Perma.cc Errors (when enabled)
- **401**: "Invalid API key"
- **403 + quota**: "Monthly quota exceeded (10 free/month)"
- **403**: "Access denied"
- **429**: "Rate limited - wait before trying again"
- **400**: "Invalid URL or request"

## Activating New Services

### Enable Perma.cc
1. Uncomment in `src/zotero-moment-o7.js`:
   ```javascript
   Services.scriptloader.loadSubScript(rootURI + "src/PermaCCPusher.js");
   ```

2. Add menu item in `addMenuItems()`:
   ```javascript
   // Create Perma.cc menu item
   const permaMenuItem = doc.createXULElement("menuitem");
   permaMenuItem.id = "zotero-moment-o7-permacc";
   permaMenuItem.setAttribute("label", "Perma.cc (Academic)");
   
   permaMenuItem.addEventListener("command", async (_event) => {
       try {
           await Zotero.PermaCCPusher.archiveSelected();
       } catch (error) {
           this.log("Error archiving to Perma.cc: " + error);
       }
   });
   ```

3. Users will be prompted for API key on first use
4. Get free API key at: https://perma.cc/settings/tools

### Enable Memento Checker
1. Uncomment in `src/zotero-moment-o7.js`:
   ```javascript
   Services.scriptloader.loadSubScript(rootURI + "src/MementoChecker.js");
   ```

2. Add menu item:
   ```javascript
   // Create Check Archives menu item
   const checkMenuItem = doc.createXULElement("menuitem");
   checkMenuItem.id = "zotero-moment-o7-check-archives";
   checkMenuItem.setAttribute("label", "Check Existing Archives");
   
   checkMenuItem.addEventListener("command", async (_event) => {
       try {
           await Zotero.MementoChecker.checkSelected();
       } catch (error) {
           this.log("Error checking archives: " + error);
       }
   });
   ```

## Benefits of Each Service

### Internet Archive
- ✅ Free and unlimited
- ✅ Well-established and trusted
- ❌ Blocked by some publishers (JSTOR, Elsevier)
- ❌ Can be slow

### Archive.today
- ✅ Works on some sites that block Internet Archive
- ✅ Creates exact visual copies
- ❌ Rate limiting
- ❌ No official API

### Perma.cc
- ✅ Designed for academic citations
- ✅ Permanent links guaranteed
- ✅ Trusted by courts and journals
- ❌ Limited free tier (10/month)
- ❌ Requires registration

### Memento Protocol
- ✅ Finds existing archives
- ✅ Prevents duplicate archiving
- ✅ Shows archive history
- ❌ Read-only (doesn't create archives)

## Common Issues and Solutions

### "Site cannot be archived"
- **Issue**: Publisher blocks archiving (common with academic publishers)
- **Solution**: Try Archive.today or Perma.cc instead

### "Rate limited"
- **Issue**: Too many requests in short time
- **Solution**: Wait 5-10 minutes before trying again

### "Monthly quota exceeded" (Perma.cc)
- **Issue**: Used all 10 free archives this month
- **Solution**: 
  - Wait until next month
  - Use Internet Archive/Archive.today instead
  - Consider Perma.cc paid plan for institutions

### "No existing archives found" (Memento)
- **Issue**: URL has never been archived
- **Solution**: Create new archive with any service

## Best Practices

1. **Check existing archives first** (when Memento enabled)
2. **Use Internet Archive** for general web content
3. **Use Archive.today** for sites that block Internet Archive
4. **Use Perma.cc** for important academic citations
5. **Create Robust Links** for maximum redundancy

## Testing New Services

### Test Perma.cc (when enabled)
```javascript
// In Zotero JavaScript console
await Zotero.PermaCCPusher.verifyApiKey();
await Zotero.PermaCCPusher.checkQuota();
```

### Test Memento (when enabled)
```javascript
// Check a URL for existing archives
const archives = await Zotero.MementoChecker.findArchives("https://example.com");
console.log(`Found ${archives.count} archives in: ${archives.sources.join(", ")}`);
```