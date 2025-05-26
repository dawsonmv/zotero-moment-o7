# Archive.today Proxy Setup Guide

## Problem Statement
Archive.today blocks CORS requests from browser extensions, requiring a proxy server to archive URLs.

## Solution: Cloudflare Worker Proxy

### Step 1: Create Cloudflare Account
1. Go to https://cloudflare.com and sign up (free tier is sufficient)
2. Verify your email address

### Step 2: Deploy the Worker
```bash
# From the plugin directory
cd worker

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Deploy the worker
npx wrangler deploy
```

### Step 3: Get Your Worker URL
After deployment, you'll see:
```
Published archive-proxy (1.0.0)
  https://archive-proxy.YOUR-SUBDOMAIN.workers.dev
```

### Step 4: Update Plugin Configuration

#### For KISS Version:
Edit `kiss/main.js` line 210:
```javascript
// Replace this:
const proxyUrl = "https://archive-proxy.YOUR-WORKER.workers.dev/archive";

// With your actual URL:
const proxyUrl = "https://archive-proxy.YOUR-SUBDOMAIN.workers.dev/archive";
```

#### For Main Version:
Set the environment variable or update the configuration:
```javascript
// In src/services/archive-today.js
const WORKER_URL = process.env.ARCHIVE_TODAY_WORKER_URL || 
                   "https://archive-proxy.YOUR-SUBDOMAIN.workers.dev";
```

### Alternative: Use Existing Public Proxy
If you don't want to deploy your own worker, you can use a public Archive.today API endpoint (if available) or request access to an existing proxy.

### Testing the Worker
```bash
# Test with curl
curl -X POST https://archive-proxy.YOUR-SUBDOMAIN.workers.dev/archive \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Expected response:
# {"archived_url": "https://archive.today/XXXXX"}
```

## Troubleshooting

### Worker Not Responding
1. Check Cloudflare dashboard for errors
2. Verify worker is deployed: `npx wrangler tail`
3. Check CORS headers in worker code

### Archive.today Blocking
1. Archive.today may rate limit - add delays between requests
2. Consider caching successful archives
3. Implement exponential backoff for retries

## Security Considerations
1. Add rate limiting to prevent abuse
2. Validate input URLs
3. Consider adding authentication for production use
4. Monitor usage to stay within Cloudflare limits