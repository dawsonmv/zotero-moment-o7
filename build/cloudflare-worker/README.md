# Zotero Archive.today Proxy Worker

This Cloudflare Worker provides a proxy service for archiving URLs to Archive.today, bypassing CORS restrictions for the Zotero Moment-o7 plugin.

## Setup Instructions

### 1. First Time Setup

1. **Create a Cloudflare account** (if you don't have one):
   - Go to https://dash.cloudflare.com/sign-up
   - Sign up for a free account

2. **Install Wrangler CLI**:
   ```bash
   cd cloudflare-worker
   npm install
   ```

3. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

### 2. Deploy the Worker

1. **Test locally** (optional):
   ```bash
   npm run dev
   ```
   This will start the worker at http://localhost:8787

2. **Deploy to Cloudflare**:
   ```bash
   npm run deploy
   ```
   
   This will output your worker URL, something like:
   ```
   https://zotero-archive-proxy.your-account.workers.dev
   ```

### 3. Configure the Worker URL

After deployment, you'll need to update your Zotero plugin to use the worker URL.

## API Usage

### Archive a URL

**Request:**
```
GET https://your-worker.workers.dev/?url=https://example.com
```

**Response:**
```json
{
  "success": true,
  "archivedUrl": "https://archive.ph/AbCdE",
  "originalUrl": "https://example.com",
  "isInProgress": false,
  "message": "Archive created successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Failed to archive URL",
  "details": "Error message"
}
```

## Security Considerations

1. **CORS Origins**: Currently allows all origins (`*`). In production, modify the `allowedOrigins` in `archive-proxy.js` to restrict access.

2. **Rate Limiting**: Consider enabling Cloudflare's rate limiting to prevent abuse:
   - Free tier: 10,000 requests/minute
   - Can configure custom rules in `wrangler.toml`

3. **API Token**: Never commit your Cloudflare API token. Use `wrangler login` instead.

## Monitoring

View logs and errors:
```bash
npm run tail
```

## Troubleshooting

1. **429 Too Many Requests**: Archive.today has rate limits. The worker will return this error if you archive too frequently.

2. **No submitid found**: Some archive.today mirrors don't require submitid. The worker handles this automatically.

3. **Work in Progress**: If `isInProgress: true`, the archive is still being created. Check the `archivedUrl` later.

## Updating

To update the worker after making changes:
```bash
npm run deploy
```