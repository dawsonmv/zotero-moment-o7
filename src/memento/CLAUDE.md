# src/memento/ - Memento Protocol Implementation

## Purpose

Implements RFC 7089 (Memento Protocol) for discovering existing web archives. Used to check if a URL already has an archived version before creating a new one.

## Files

| File | Purpose |
|------|---------|
| `MementoProtocol.ts` | Stateless utilities for parsing RFC 7089 Link headers and TimeMaps |
| `MementoChecker.ts` | High-level API for checking existing archives |

## RFC 7089 Overview

The Memento Protocol defines how to discover archived versions (mementos) of web resources:

```
Original Resource (URI-R) ←→ TimeGate (URI-G) ←→ Mementos (URI-M)
                                    ↓
                              TimeMap (URI-T)
```

- **Original Resource (URI-R)**: The live URL being archived
- **TimeGate (URI-G)**: Endpoint that negotiates for mementos by datetime
- **TimeMap (URI-T)**: List of all mementos for a resource
- **Memento (URI-M)**: An archived snapshot with a specific datetime

## MementoProtocol.ts

Stateless utility class for RFC 7089 parsing:

```typescript
// Parse Link header (RFC 5988)
const links = MementoProtocol.parseLinkHeader(
  '<http://archive.org/web/123/http://example.com>; rel="memento"; datetime="..."'
);
// → [{ url: '...', rel: ['memento'], datetime: '...' }]

// Format Link header
const header = MementoProtocol.formatLinkHeader(links);

// Parse TimeMap (JSON format from IA)
const timemap = MementoProtocol.parseTimeMap(jsonResponse);
// → { original: '...', mementos: [{ url, datetime }, ...] }

// Parse TimeMap (link format)
const timemap = MementoProtocol.parseTimemapLinkFormat(textResponse);

// Find best memento
const nearest = MementoProtocol.findBestMemento(mementos, targetDate);
// Without date: returns most recent

// Check if response is a memento
const isMemento = MementoProtocol.isMemento(responseHeaders);

// Extract memento info from headers
const info = MementoProtocol.extractMementoInfo(responseHeaders);
// → { mementoUrl, mementoDatetime, original, links }
```

## MementoChecker.ts

High-level API for checking archives:

```typescript
const checker = new MementoChecker();

// Check if URL has existing archives
const result = await checker.checkExistingArchives(url);
if (result.hasArchive) {
  console.log(`Found ${result.mementos.length} archives`);
  console.log(`Most recent: ${result.mostRecent.url}`);
}

// Get specific memento by date
const memento = await checker.getMementoForDate(url, new Date('2023-01-01'));
```

## Link Header Format

RFC 7089 uses Link headers with specific relations:

```http
Link: <http://example.com>; rel="original",
      <http://archive.org/timegate/http://example.com>; rel="timegate",
      <http://archive.org/timemap/http://example.com>; rel="timemap",
      <http://archive.org/web/20230101/http://example.com>; rel="memento"; datetime="Mon, 01 Jan 2023 00:00:00 GMT"
```

Parsed to:
```typescript
interface MementoLink {
  url: string;
  rel: string[];        // ['memento', 'first', 'last', etc.]
  datetime?: string;    // HTTP date format
  type?: string;        // MIME type for timemaps
  from?: string;        // Range start
  until?: string;       // Range end
}
```

## TimeMap Formats

### JSON (Internet Archive CDX API)

```json
{
  "original_uri": "http://example.com",
  "timegate_uri": "http://web.archive.org/web/...",
  "timemap_uri": "http://web.archive.org/web/timemap/...",
  "mementos": {
    "list": [
      { "uri": "http://web.archive.org/web/20230101/...", "datetime": "..." }
    ]
  }
}
```

### Link Format (RFC 7089)

```
<http://example.com>; rel="original",
<http://archive.org/web/20230101/http://example.com>; rel="memento"; datetime="..."
```

## Usage in Archiving Workflow

```typescript
// Before archiving, check for existing
const checker = new MementoChecker();
const existing = await checker.checkExistingArchives(url);

if (existing.hasArchive) {
  const recent = existing.mostRecent;
  const age = Date.now() - new Date(recent.datetime).getTime();

  if (age < 86400000) { // Less than 24 hours old
    return existing.mostRecent.url; // Use existing
  }
}

// No recent archive, create new one
return await archiveService.archiveUrl(url);
```

## Gotchas

- **Internet Archive TimeMap**: Use `http://web.archive.org/web/timemap/link/{url}`
- **CDX API**: Use `http://web.archive.org/cdx/search/cdx?url={url}&output=json`
- **Datetime format**: HTTP date format (RFC 7231), not ISO 8601
- **Memento relations**: Can have multiple (`rel="memento first"`)
- **Link header parsing**: Handle missing quotes around datetime values
