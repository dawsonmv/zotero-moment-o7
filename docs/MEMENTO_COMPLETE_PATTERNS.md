# Memento Protocol Complete Implementation Patterns

## Protocol Flow Overview

The complete Memento negotiation flow:

```
┌─────────┐         ┌──────────────┐         ┌──────────┐         ┌─────────┐
│ Client  │         │   Original   │         │ TimeGate │         │ Memento │
└────┬────┘         │   Resource   │         └────┬─────┘         └────┬────┘
     │              └──────┬───────┘              │                    │
     │                     │                      │                    │
     │  GET URI-R          │                      │                    │
     │  Accept-Datetime: X │                      │                    │
     ├────────────────────►│                      │                    │
     │                     │                      │                    │
     │  302 Found          │                      │                    │
     │  Location: URI-G    │                      │                    │
     │◄────────────────────┤                      │                    │
     │                     │                      │                    │
     │  GET URI-G                                 │                    │
     │  Accept-Datetime: X                        │                    │
     ├───────────────────────────────────────────►│                    │
     │                                            │                    │
     │  302 Found                                 │                    │
     │  Location: URI-M                           │                    │
     │◄───────────────────────────────────────────┤                    │
     │                                            │                    │
     │  GET URI-M                                                      │
     ├────────────────────────────────────────────────────────────────►│
     │                                                                 │
     │  200 OK                                                         │
     │  Memento-Datetime: X                                            │
     │◄────────────────────────────────────────────────────────────────┤
     │                                                                 │
```

## Pattern 1.1: 302-Style Negotiation (Original Resource as TimeGate)

### Request:
```http
GET /page HTTP/1.1
Host: example.com
Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT
```

### Response:
```http
HTTP/1.1 302 Found
Location: http://example.com/page/20070531203500
Vary: accept-datetime
Link: <http://example.com/page>; rel="original latest-version",
      <http://example.com/page/timemap>; rel="timemap"; type="application/link-format",
      <http://example.com/page/20070531203500>; rel="memento"; datetime="Thu, 31 May 2007 20:35:00 GMT"
```

### Implementation:
```javascript
// Express.js example
app.get('/page', (req, res) => {
    const acceptDatetime = req.headers['accept-datetime'];
    
    if (acceptDatetime) {
        // Parse datetime and find closest version
        const targetDate = new Date(acceptDatetime);
        const closestVersion = findClosestVersion(targetDate);
        
        res.status(302);
        res.set({
            'Location': closestVersion.uri,
            'Vary': 'accept-datetime',
            'Link': buildLinkHeader({
                original: req.url,
                timemap: `${req.url}/timemap`,
                memento: closestVersion
            })
        });
        res.end();
    } else {
        // Serve current version
        res.send(currentContent);
    }
});
```

## Pattern 1.2: 200-Style Negotiation (Original Resource as TimeGate)

### Request:
```http
GET /page HTTP/1.1
Host: example.com
Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT
```

### Response:
```http
HTTP/1.1 200 OK
Content-Location: http://example.com/page/20070531203500
Vary: accept-datetime
Memento-Datetime: Thu, 31 May 2007 20:35:00 GMT
Link: <http://example.com/page>; rel="original timegate latest-version",
      <http://example.com/page/timemap>; rel="timemap"; type="application/link-format",
      <http://example.com/page/20070531203500>; rel="memento"; datetime="Thu, 31 May 2007 20:35:00 GMT"
Content-Type: text/html

[Memento content]
```

## Pattern 2.1: Remote TimeGate with 302

### Step 1 - Original Resource Response:
```http
HTTP/1.1 200 OK
Link: <http://timegate.example.org/gate/http://example.com/page>; rel="timegate",
      <http://timegate.example.org/map/http://example.com/page>; rel="timemap"
```

### Step 2 - TimeGate Request:
```http
GET /gate/http://example.com/page HTTP/1.1
Host: timegate.example.org
Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT
```

### Step 3 - TimeGate Response:
```http
HTTP/1.1 302 Found
Location: http://archive.example.org/20070531203500/http://example.com/page
Vary: accept-datetime
Link: <http://example.com/page>; rel="original",
      <http://timegate.example.org/gate/http://example.com/page>; rel="timegate",
      <http://timegate.example.org/map/http://example.com/page>; rel="timemap",
      <http://archive.example.org/20070531203500/http://example.com/page>; rel="memento"; datetime="Thu, 31 May 2007 20:35:00 GMT"
```

## Pattern 2.2: Remote TimeGate with 200

Similar to 2.1, but TimeGate returns:
```http
HTTP/1.1 200 OK
Content-Location: http://archive.example.org/20070531203500/http://example.com/page
Vary: accept-datetime
Memento-Datetime: Thu, 31 May 2007 20:35:00 GMT
Link: [same as 2.1]

[Memento content]
```

## Pattern 3: Original Resource is a Fixed Resource

### Request:
```http
GET /page/v1 HTTP/1.1
Host: example.com
```

### Response:
```http
HTTP/1.1 200 OK
Memento-Datetime: Thu, 31 May 2007 20:35:00 GMT
Link: <http://example.com/page>; rel="original",
      <http://example.com/page/timemap>; rel="timemap"

[Fixed content]
```

## Datetime Negotiation Algorithm

```javascript
function selectMemento(acceptDatetime, availableMementos) {
    const target = new Date(acceptDatetime);
    
    // Find exact match
    const exact = availableMementos.find(m => 
        m.datetime.getTime() === target.getTime()
    );
    if (exact) return exact;
    
    // Find closest
    let closest = null;
    let minDiff = Infinity;
    
    for (const memento of availableMementos) {
        const diff = Math.abs(memento.datetime - target);
        if (diff < minDiff) {
            minDiff = diff;
            closest = memento;
        }
    }
    
    return closest;
}
```

## Complete TimeMap Response

### Link Format (RFC 6690):
```
<http://example.com/page>; rel="original",
<http://example.com/page>; rel="timegate",
<http://example.com/page/timemap>; rel="self"; type="application/link-format",
<http://example.com/page/20010512>; rel="first memento"; datetime="Sat, 12 May 2001 04:00:39 GMT",
<http://example.com/page/20070531>; rel="memento"; datetime="Thu, 31 May 2007 20:35:00 GMT",
<http://example.com/page/20240115>; rel="last memento"; datetime="Mon, 15 Jan 2024 10:30:00 GMT"
```

### JSON Format:
```json
{
    "original_uri": "http://example.com/page",
    "timegate_uri": "http://example.com/page",
    "timemap_uri": {
        "link_format": "http://example.com/page/timemap",
        "json_format": "http://example.com/page/timemap/json"
    },
    "mementos": {
        "first": {
            "datetime": "2001-05-12T04:00:39Z",
            "uri": "http://example.com/page/20010512"
        },
        "last": {
            "datetime": "2024-01-15T10:30:00Z",
            "uri": "http://example.com/page/20240115"
        },
        "list": [
            {
                "datetime": "2001-05-12T04:00:39Z",
                "uri": "http://example.com/page/20010512"
            },
            {
                "datetime": "2007-05-31T20:35:00Z",
                "uri": "http://example.com/page/20070531"
            },
            {
                "datetime": "2024-01-15T10:30:00Z",
                "uri": "http://example.com/page/20240115"
            }
        ]
    }
}
```

## Implementation Checklist

### For Original Resources:
- [ ] Add Link header pointing to TimeGate and TimeMap
- [ ] Handle Accept-Datetime if acting as own TimeGate
- [ ] Include Vary: accept-datetime when applicable

### For TimeGates:
- [ ] Parse Accept-Datetime header (RFC 1123 format)
- [ ] Select appropriate Memento based on datetime
- [ ] Return 302/200 based on pattern
- [ ] Include all required Link relations
- [ ] Set Vary: accept-datetime

### For Mementos:
- [ ] Include Memento-Datetime header
- [ ] Add Link relations to original, timegate, timemap
- [ ] Ensure content is immutable

### For TimeMaps:
- [ ] Support at least application/link-format
- [ ] Include all available Mementos with datetime
- [ ] Mark first/last appropriately
- [ ] Consider pagination for large collections

## Error Handling

### 400 Bad Request
- Invalid Accept-Datetime format
- Malformed request

### 404 Not Found
- No Mementos available for resource
- Resource never archived

### 406 Not Acceptable
- Cannot provide response in requested format
- No Memento near requested datetime

## Testing

### Validate Headers:
```bash
# Check TimeGate
curl -I -H "Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT" http://example.com/page

# Check Memento
curl -I http://example.com/page/20070531203500

# Get TimeMap
curl http://example.com/page/timemap
```

### Common Issues:
1. **Missing datetime attribute** on memento links
2. **Incorrect datetime format** (must be RFC 1123)
3. **Missing Vary header** on TimeGate responses
4. **Mutable Mementos** (violates protocol)
5. **Incomplete Link relations**