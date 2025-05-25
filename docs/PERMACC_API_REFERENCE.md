# Perma.cc API Reference (2024)

## Overview
Perma.cc helps scholars, journals, courts, and others create permanent records of web sources. The API enables programmatic archive creation and management.

## Base URL
```
https://api.perma.cc/v1/
```

## Authentication

### API Key
- Get your API key from: https://perma.cc/settings/tools
- Include in requests: `Authorization: ApiKey YOUR_API_KEY`

### Example
```bash
curl -H "Authorization: ApiKey your-api-key" https://api.perma.cc/v1/user/
```

## Core Endpoints

### 1. User Information
Get user details and quota information.

```http
GET /v1/user/
```

Response:
```json
{
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "short_name": "John",
    "link_limit": 10,
    "links_remaining": 7,
    "registrar": "Library Name",
    "organizations": [
        {
            "id": 1,
            "name": "My Organization"
        }
    ]
}
```

### 2. Create Archive

```http
POST /v1/archives/
Content-Type: application/json

{
    "url": "https://example.com",
    "title": "Optional custom title",
    "folder": 123  // Optional folder ID
}
```

Response:
```json
{
    "guid": "ABCD-1234",
    "creation_timestamp": "2024-01-15T10:30:00Z",
    "url": "https://example.com",
    "title": "Example Domain",
    "description": "",
    "warc_size": 123456,
    "archive_timestamp": "2024-01-15T10:30:05Z",
    "captures": [
        {
            "role": "primary",
            "status": "success",
            "url": "https://example.com",
            "record_type": "response",
            "content_type": "text/html"
        }
    ]
}
```

### 3. Get Archive Details

```http
GET /v1/archives/{guid}/
```

Example:
```http
GET /v1/archives/ABCD-1234/
```

### 4. List Archives

```http
GET /v1/archives/
```

Query Parameters:
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset
- `folder`: Filter by folder ID
- `order_by`: Sort field (e.g., `-creation_timestamp`)

### 5. Folders

#### List Folders
```http
GET /v1/folders/
```

#### Create Folder
```http
POST /v1/folders/
Content-Type: application/json

{
    "name": "Research Papers",
    "parent": 1  // Optional parent folder ID
}
```

## Error Responses

### 400 Bad Request
```json
{
    "error": "Invalid URL provided"
}
```

### 401 Unauthorized
```json
{
    "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
    "error": "You have reached your link limit."
}
```

### 429 Rate Limited
```json
{
    "error": "Rate limit exceeded. Please try again later."
}
```

## Rate Limits and Quotas

### Free Tier
- **Monthly Limit**: 10 archives
- **Rate Limit**: Not explicitly documented, but reasonable use expected

### Academic/Paid Tiers
- Higher limits available for institutions
- Contact Perma.cc for details

## Best Practices

### 1. Check Quota Before Archiving
```javascript
async function canArchive() {
    const user = await getUser();
    return user.links_remaining > 0;
}
```

### 2. Handle Errors Gracefully
```javascript
try {
    const archive = await createArchive(url);
} catch (error) {
    if (error.status === 403) {
        // Quota exceeded
        showQuotaExceededMessage();
    } else if (error.status === 429) {
        // Rate limited
        await delay(60000); // Wait 1 minute
        retry();
    }
}
```

### 3. Use Folders for Organization
```javascript
// Get or create a folder for the current project
const folder = await getOrCreateFolder("Zotero Archives");
const archive = await createArchive(url, { folder: folder.id });
```

## Integration Example

```javascript
class PermaCC {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.perma.cc/v1';
    }
    
    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Authorization': `ApiKey ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        return response.json();
    }
    
    async createArchive(url, title = null, folder = null) {
        const data = { url };
        if (title) data.title = title;
        if (folder) data.folder = folder;
        
        return this.request('POST', '/archives/', data);
    }
    
    async getQuota() {
        const user = await this.request('GET', '/user/');
        return {
            used: user.link_limit - user.links_remaining,
            limit: user.link_limit,
            remaining: user.links_remaining
        };
    }
}
```

## Notes

1. **Archive URLs**: Created archives are available at `https://perma.cc/{GUID}`
2. **WARC Files**: Full WARC files can be downloaded for each archive
3. **Timestamps**: All timestamps are in UTC
4. **Preservation**: Archives are preserved indefinitely

## Support

- Documentation: https://perma.cc/docs
- Help: https://perma.cc/contact
- Status: https://status.perma.cc/