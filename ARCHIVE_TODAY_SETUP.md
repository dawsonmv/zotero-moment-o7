# Archive.today Integration Setup Guide

This guide will help you set up Archive.today support for Zotero Moment-o7 using a Cloudflare Worker proxy.

## Overview

Archive.today doesn't allow direct access from browser extensions due to CORS restrictions. We solve this by using a Cloudflare Worker as a proxy server.

## Step 1: Set Up Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account (100,000 requests/day included)
3. Verify your email

## Step 2: Install Dependencies

```bash
cd cloudflare-worker
npm install
```

## Step 3: Deploy the Worker

1. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```
   This will open your browser to authenticate.

2. **Deploy the Worker**:
   ```bash
   npm run deploy
   ```

3. **Save the Worker URL**:
   The deployment will output your worker URL:
   ```
   https://zotero-archive-proxy.[your-subdomain].workers.dev
   ```

## Step 4: Configure Zotero Plugin

1. In Zotero, right-click on any item
2. Go to "Archive this Resource" → "Settings..."
3. Enter your Worker URL from Step 3
4. Click OK

## Step 5: Test the Integration

1. Select an item with a URL in Zotero
2. Right-click → "Archive this Resource" → "Archive.today"
3. Check the item's Extra field and Notes for the archived URL

## Troubleshooting

### "Worker URL not configured"
- Make sure you've completed Step 4
- The default localhost URL only works during development

### "429 Too Many Requests"
- Archive.today has rate limits
- Wait a few minutes before trying again
- Consider archiving items in smaller batches

### "Failed to archive URL"
- Check that the URL is valid and accessible
- Some sites may block archiving
- Try archiving directly on archive.today to confirm

### Worker Logs
To view real-time logs from your worker:
```bash
cd cloudflare-worker
npm run tail
```

## Security Notes

1. The worker is publicly accessible by default
2. Consider adding authentication or IP restrictions for production use
3. Monitor usage in your Cloudflare dashboard

## Updating the Worker

If you need to update the worker code:
```bash
cd cloudflare-worker
npm run deploy
```

## Support

For issues with:
- **The Worker**: Check cloudflare-worker/README.md
- **The Plugin**: File an issue on the Zotero Moment-o7 repository
- **Archive.today**: This is a third-party service with its own limitations