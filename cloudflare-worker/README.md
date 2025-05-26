# Archive.today Proxy Worker

A Cloudflare Worker that proxies requests to Archive.today to bypass CORS restrictions.

## Setup

1. Install Wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
3. Deploy: `wrangler publish`

## Usage

POST to `https://your-worker.workers.dev/archive` with:
```json
{
  "url": "https://example.com"
}
```

Returns:
```json
{
  "archived_url": "https://archive.today/abcde"
}
```

## Configuration

Update `wrangler.toml` with your account ID and worker name.