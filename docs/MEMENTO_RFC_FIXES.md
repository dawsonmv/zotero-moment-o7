# Memento RFC 7089 Compliance Fixes

## Variable Naming Inconsistencies

### Current Issues:
1. `TIMEMAP_URL` should be `TimeMapUrl` or `timeMapUrl` for consistency
2. `TIMEGATE_URL` should be `TimeGateUrl` or `timeGateUrl` for consistency
3. Property `datetime` in responses is inconsistent with RFC examples

### RFC-Compliant Headers:
- `Accept-Datetime` (not Accept-DateTime or accept-datetime)
- `Memento-Datetime` (not Memento-DateTime or memento-datetime)
- `Link` header with proper rel types

## Implementation Fixes Needed

### 1. Fix TimeGate Request (MementoChecker.js)

Current implementation:
```javascript
// Line 78-83
const dateStr = datetime.toISOString().slice(0, 19).replace(/[-:]/g, "");
const timegateUrl = `${this.TIMEGATE_URL}${dateStr}/${url}`;

const response = await Zotero.HTTP.request("HEAD", timegateUrl, {
    timeout: 10000
});
```

RFC-Compliant implementation:
```javascript
const acceptDatetime = datetime.toUTCString(); // RFC 1123 format
const timegateUrl = `${this.TIMEGATE_URL}${url}`;

const response = await Zotero.HTTP.request("HEAD", timegateUrl, {
    headers: {
        "Accept-Datetime": acceptDatetime
    },
    timeout: 10000
});
```

### 2. Enhanced Link Header Parsing

Current implementation only extracts memento links. RFC requires parsing:
- `rel="original"` - The original resource
- `rel="timemap"` - The TimeMap for this resource
- `rel="timegate"` - The TimeGate for this resource
- `rel="first memento"` - First memento
- `rel="last memento"` - Last memento
- `rel="memento"` - A memento

### 3. Response Status Codes

RFC 7089 specifies:
- 200 OK - Memento found at requested time
- 302 Found - Redirect to closest memento
- 400 Bad Request - Invalid Accept-Datetime
- 404 Not Found - No mementos exist
- 406 Not Acceptable - No memento at acceptable time

### 4. Datetime Format

RFC 7089 requires HTTP-date format (RFC 1123):
```
Accept-Datetime: Thu, 31 May 2007 20:35:00 GMT
```

Not:
```
Accept-Datetime: 20070531203500
```

## Recommended Refactoring

1. Create a `MementoProtocol` class that properly implements RFC 7089
2. Use consistent variable naming throughout
3. Add proper error handling for all status codes
4. Parse complete Link header information
5. Use proper datetime formatting

## Test Cases Needed

1. TimeGate negotiation with Accept-Datetime
2. Link header parsing with multiple rel types
3. Error handling for various status codes
4. Datetime format validation
5. TimeMap JSON parsing