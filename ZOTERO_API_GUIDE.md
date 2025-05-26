# Zotero API Communication Guide

This guide shows how to communicate with Zotero through the localhost API at `http://localhost:23119/api`.

## Prerequisites

1. **Zotero must be running**
2. **Enable API access** in Zotero:
   - Go to Preferences → Advanced → General
   - Check "Allow other applications to communicate with Zotero"

## API Basics

- **Base URL**: `http://localhost:23119/api`
- **User ID**: `0` (for local library)
- **Required Header**: `Zotero-API-Version: 3`

## Quick Examples

### Using cURL

```bash
# Get collections
curl http://localhost:23119/api/users/0/collections -H "Zotero-API-Version: 3"

# Get recent items
curl http://localhost:23119/api/users/0/items?limit=5 -H "Zotero-API-Version: 3"

# Search for items
curl "http://localhost:23119/api/users/0/items?q=web" -H "Zotero-API-Version: 3"

# Get items with a specific tag
curl "http://localhost:23119/api/users/0/items?tag=archived" -H "Zotero-API-Version: 3"
```

### Using JavaScript (Node.js)

```javascript
const http = require('http');

// Make API request
function apiRequest(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:23119/api${path}`, {
            headers: { 'Zotero-API-Version': '3' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

// Example: Get recent items
apiRequest('/users/0/items?limit=5').then(items => {
    items.forEach(item => console.log(item.data.title));
});
```

### Using Python

```python
import urllib.request
import json

def get_zotero_items():
    url = "http://localhost:23119/api/users/0/items?limit=5"
    req = urllib.request.Request(url, headers={"Zotero-API-Version": "3"})
    
    with urllib.request.urlopen(req) as response:
        items = json.loads(response.read())
        for item in items:
            print(item['data'].get('title', 'Untitled'))

get_zotero_items()
```

## Common API Endpoints

### Items
- `GET /users/0/items` - Get all items
- `GET /users/0/items?q=search_term` - Search items
- `GET /users/0/items?tag=tag_name` - Get items by tag
- `GET /users/0/items/{itemKey}` - Get specific item
- `POST /users/0/items` - Create new items
- `PATCH /users/0/items/{itemKey}` - Update item

### Collections
- `GET /users/0/collections` - Get all collections
- `GET /users/0/collections/{collectionKey}/items` - Get items in collection

### Tags
- `GET /users/0/tags` - Get all tags
- `GET /users/0/tags/{tagName}` - Get specific tag

## Working with Moment-o7 Data

### Find Archived Items
```bash
# Items with 'archived' tag
curl "http://localhost:23119/api/users/0/items?tag=archived" -H "Zotero-API-Version: 3"

# Items with 'moment' tag
curl "http://localhost:23119/api/users/0/items?tag=moment" -H "Zotero-API-Version: 3"
```

### Check Archive Status
Look for archive URLs in the item's `extra` field:
```javascript
items.forEach(item => {
    if (item.data.extra && item.data.extra.includes('Archived at:')) {
        console.log(`${item.data.title} has been archived`);
    }
});
```

## Creating Items

### Create a Note
```bash
curl -X POST http://localhost:23119/api/users/0/items \
  -H "Content-Type: application/json" \
  -H "Zotero-API-Version: 3" \
  -d '[{"itemType": "note", "note": "<p>Test note</p>", "tags": [{"tag": "api-test"}]}]'
```

### Create a Webpage
```javascript
const webpage = {
    itemType: "webpage",
    title: "Example Article",
    url: "https://example.com/article",
    accessDate: new Date().toISOString().split('T')[0],
    tags: [{ tag: "to-archive", type: 0 }]
};

fetch('http://localhost:23119/api/users/0/items', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Zotero-API-Version': '3'
    },
    body: JSON.stringify([webpage])
});
```

## Available Scripts

This repository includes ready-to-use examples:

1. **JavaScript Examples**: `node zotero-api-examples.js`
2. **Python Examples**: `python3 simple_zotero_api.py`
3. **API Test**: `./scripts/test-api.sh`

## Troubleshooting

### Connection Refused
- Make sure Zotero is running
- Check that API is enabled in Preferences

### 400 Bad Request
- Check your JSON formatting
- Ensure required fields are included
- Verify the item type is valid

### 404 Not Found
- Check the endpoint URL
- Verify the item/collection key exists

## Further Reading

- [Zotero Web API Documentation](https://www.zotero.org/support/dev/web_api/v3/basics)
- [Zotero API Playground](https://github.com/zotero/api-playground)
- [Item Type/Field Mappings](https://api.zotero.org/itemTypeFields)