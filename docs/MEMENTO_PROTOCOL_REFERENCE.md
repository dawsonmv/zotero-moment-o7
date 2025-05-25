# Memento Protocol Reference (RFC 7089)

## Overview
The Memento Protocol (RFC 7089) enables time-based access to web resources by introducing datetime negotiation between clients and servers.

## Key Concepts

### 1. Resource Types

- **Original Resource (URI-R)**: The current version of a web resource
- **TimeGate (URI-G)**: Service that performs datetime negotiation to support access to prior states
- **Memento (URI-M)**: A resource that encapsulates a prior state of the Original Resource
- **TimeMap (URI-T)**: A resource that lists URIs of Mementos of the Original Resource

### 2. HTTP Headers

#### Request Headers
```http
Accept-Datetime: Wed, 30 May 2007 18:47:52 GMT
```
The Accept-Datetime header is transmitted by a user agent to indicate it wants to access a past state of an Original Resource.

#### Response Headers

**From TimeGate (302 redirect):**
```http
HTTP/1.1 302 Found
Location: http://archive.org/web/20070530184752/http://example.com
Vary: accept-datetime
Link: <http://example.com>; rel="original",
      <http://archive.org/web/20070530184752/http://example.com>; rel="memento"; datetime="Wed, 30 May 2007 18:47:52 GMT",
      <http://example.com/timemap>; rel="timemap"; type="application/link-format"
```

**From Memento:**
```http
HTTP/1.1 200 OK
Memento-Datetime: Wed, 30 May 2007 18:47:52 GMT
Link: <http://example.com>; rel="original",
      <http://example.com/timegate>; rel="timegate",
      <http://example.com/timemap>; rel="timemap"
```

**Important**: The Memento-Datetime header constitutes a promise that the resource state will no longer change.

## Common Aggregators

### 1. TimeTravel (Memento Aggregator)
```
Base URL: https://timetravel.mementoweb.org/
```

#### Find Mementos
```http
GET /timegate/{url}
Accept-Datetime: {RFC1123 datetime}
```

Example:
```bash
curl -H "Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT" \
     https://timetravel.mementoweb.org/timegate/http://example.com
```

#### Get TimeMap
```http
GET /timemap/{format}/{url}
```

Formats:
- `link`: application/link-format
- `json`: application/json
- `cdxj`: application/cdxj+ors

Example:
```bash
curl https://timetravel.mementoweb.org/timemap/json/http://example.com
```

Response:
```json
{
  "original_uri": "http://example.com",
  "timegate_uri": "https://timetravel.mementoweb.org/timegate/http://example.com",
  "timemap_uri": {
    "json_format": "https://timetravel.mementoweb.org/timemap/json/http://example.com",
    "link_format": "https://timetravel.mementoweb.org/timemap/link/http://example.com"
  },
  "mementos": {
    "first": {
      "datetime": "2001-05-12T04:00:39Z",
      "uri": "https://web.archive.org/web/20010512040039/http://example.com"
    },
    "last": {
      "datetime": "2024-01-15T10:30:00Z",
      "uri": "https://web.archive.org/web/20240115103000/http://example.com"
    },
    "list": [
      {
        "datetime": "2001-05-12T04:00:39Z",
        "uri": "https://web.archive.org/web/20010512040039/http://example.com"
      },
      // ... more mementos
    ]
  }
}
```

## RFC 7089 Implementation Patterns

The RFC defines several patterns based on the relationship between Original Resource and TimeGate:

### Pattern 1.1: Original Resource acts as its own TimeGate
Common in wikis and version control systems where the current resource can negotiate for past versions.

### Pattern 1.2: TimeGate is a separate resource
Most web archives use this pattern where a dedicated TimeGate service handles datetime negotiation.

### Pattern 2: Remote TimeGate
A third-party service acts as TimeGate for resources it doesn't host.

### Pattern 3: Original Resource is a Fixed Resource
The resource represents a specific version and doesn't change.

## Code Implementation Patterns

### Pattern 1: Check for Existing Archives
```javascript
async function checkExistingArchives(url) {
    const timemapUrl = `https://timetravel.mementoweb.org/timemap/json/${url}`;
    
    try {
        const response = await fetch(timemapUrl);
        if (response.ok) {
            const data = await response.json();
            return {
                exists: data.mementos.list.length > 0,
                count: data.mementos.list.length,
                first: data.mementos.first,
                last: data.mementos.last,
                archives: data.mementos.list
            };
        }
    } catch (error) {
        console.error('Memento check failed:', error);
    }
    
    return { exists: false, count: 0 };
}
```

### Pattern 2: Find Closest Archive to Date
```javascript
async function findClosestArchive(url, targetDate) {
    const headers = {
        'Accept-Datetime': targetDate.toUTCString()
    };
    
    const response = await fetch(
        `https://timetravel.mementoweb.org/timegate/${url}`,
        { headers, redirect: 'manual' }
    );
    
    if (response.status === 302) {
        return {
            found: true,
            location: response.headers.get('Location'),
            datetime: response.headers.get('Memento-Datetime')
        };
    }
    
    return { found: false };
}
```

### Pattern 3: Parse Link Headers
```javascript
function parseLinkHeader(linkHeader) {
    const links = {};
    const parts = linkHeader.split(',');
    
    parts.forEach(part => {
        const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"(?:;\s*datetime="([^"]+)")?(?:;\s*type="([^"]+)")?/);
        if (match) {
            const [, url, rel, datetime, type] = match;
            links[rel] = { url, datetime, type };
        }
    });
    
    return links;
}
```

### Important Link Relations

According to RFC 7089, these relation types are defined:

1. **"original"** - Points to the Original Resource
2. **"timegate"** - Points to a TimeGate for the Original Resource
3. **"timemap"** - Points to a TimeMap for the Original Resource
4. **"memento"** - Points to a Memento (MUST include datetime attribute)

**Critical**: When using rel="memento", the datetime attribute is REQUIRED:
```http
Link: <http://archive.org/web/20070530/http://example.com>; rel="memento"; datetime="Wed, 30 May 2007 18:47:52 GMT"
```

## Archive Sources

Common archives that support Memento:

### 1. Internet Archive
```
TimeGate: https://web.archive.org/web/
TimeMap: https://web.archive.org/web/timemap/link/{url}
```

### 2. Archive.today
```
Limited Memento support
Direct URL pattern: https://archive.today/{url}
```

### 3. UK Web Archive
```
TimeGate: https://www.webarchive.org.uk/wayback/archive/
```

### 4. Portuguese Web Archive
```
TimeGate: https://arquivo.pt/wayback/
```

### 5. Library of Congress
```
TimeGate: https://webarchive.loc.gov/all/
```

## Error Handling

### 404 Not Found
No mementos exist for the requested URL.

### 400 Bad Request
Invalid datetime format or URL.

### 406 Not Acceptable
Accept-Datetime header parsing failed.

## Best Practices

### 1. Cache TimeMap Results
```javascript
const timemapCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour

async function getCachedTimemap(url) {
    const cached = timemapCache.get(url);
    if (cached && Date.now() - cached.time < CACHE_DURATION) {
        return cached.data;
    }
    
    const data = await fetchTimemap(url);
    timemapCache.set(url, { data, time: Date.now() });
    return data;
}
```

### 2. Handle Multiple Archives
```javascript
function groupArchivesBySource(mementos) {
    const grouped = {};
    
    mementos.forEach(memento => {
        const source = detectArchiveSource(memento.uri);
        if (!grouped[source]) {
            grouped[source] = [];
        }
        grouped[source].push(memento);
    });
    
    return grouped;
}

function detectArchiveSource(uri) {
    if (uri.includes('web.archive.org')) return 'Internet Archive';
    if (uri.includes('archive.today')) return 'Archive.today';
    if (uri.includes('webarchive.org.uk')) return 'UK Web Archive';
    // ... more sources
    return 'Other';
}
```

### 3. User-Friendly Date Display
```javascript
function formatMementoDate(datetime) {
    const date = new Date(datetime);
    const age = Date.now() - date.getTime();
    const days = Math.floor(age / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}
```

## Integration Example

```javascript
class MementoClient {
    constructor(aggregatorUrl = 'https://timetravel.mementoweb.org') {
        this.baseUrl = aggregatorUrl;
    }
    
    async findArchives(url) {
        const response = await fetch(`${this.baseUrl}/timemap/json/${url}`);
        if (!response.ok) {
            throw new Error(`Memento lookup failed: ${response.status}`);
        }
        return response.json();
    }
    
    async getClosestToNow(url) {
        const response = await fetch(`${this.baseUrl}/timegate/${url}`, {
            redirect: 'manual'
        });
        
        if (response.status === 302) {
            return response.headers.get('Location');
        }
        return null;
    }
    
    async checkIfArchived(url) {
        try {
            const data = await this.findArchives(url);
            return data.mementos.list.length > 0;
        } catch {
            return false;
        }
    }
}
```

## TimeMap Format

The default serialization of a TimeMap follows RFC 6690 (application/link-format):

```
<http://example.com>; rel="original",
<http://example.com/timegate>; rel="timegate",
<http://archive.org/web/20010512040039/http://example.com>; rel="first memento"; datetime="Sat, 12 May 2001 04:00:39 GMT",
<http://archive.org/web/20070530184752/http://example.com>; rel="memento"; datetime="Wed, 30 May 2007 18:47:52 GMT",
<http://archive.org/web/20240115103000/http://example.com>; rel="last memento"; datetime="Mon, 15 Jan 2024 10:30:00 GMT"
```

## Version Navigation

Enable navigation between versions using these link relations:
- `prev` / `next` - Previous/next in sequence
- `predecessor-version` / `successor-version` - Previous/next version
- `first` / `last` - First/last in collection

Example:
```http
Link: <http://archive.org/web/20070529/http://example.com>; rel="prev memento"; datetime="Tue, 29 May 2007 12:00:00 GMT",
      <http://archive.org/web/20070531/http://example.com>; rel="next memento"; datetime="Thu, 31 May 2007 12:00:00 GMT"
```

## Compliance and Validation

Tools for checking RFC 7089 compliance:
- **Memento Validator**: Checks compliance of HTTP responses
- **Open Wayback**: Fully compliant implementation
- **pywb**: Python Web Archive toolkit with Memento support

## References

- RFC 7089: https://datatracker.ietf.org/doc/html/rfc7089
- RFC 6690 (Link Format): https://datatracker.ietf.org/doc/html/rfc6690
- Memento Guide: http://mementoweb.org/guide/
- TimeTravel Service: https://timetravel.mementoweb.org/
- Memento Protocol Info: http://mementoweb.org/