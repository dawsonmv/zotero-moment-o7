#!/usr/bin/env python3
"""
Simple Zotero API Communication - No external dependencies
Uses only Python standard library
"""

import json
import urllib.request
import urllib.parse
from datetime import datetime

# Configuration
API_BASE = "http://localhost:23119/api"
USER_ID = "0"

def api_request(method, path, data=None):
    """Make a request to the Zotero API"""
    url = API_BASE + path
    headers = {
        "Content-Type": "application/json",
        "Zotero-API-Version": "3"
    }
    
    request = urllib.request.Request(url, headers=headers, method=method)
    
    if data:
        request.data = json.dumps(data).encode('utf-8')
    
    try:
        with urllib.request.urlopen(request) as response:
            return {
                "status": response.status,
                "data": json.loads(response.read().decode('utf-8'))
            }
    except urllib.error.HTTPError as e:
        return {"status": e.code, "error": str(e)}

# Example usage
print("🔍 Simple Zotero API Test")
print("=" * 40)

# Get collections
print("\n📁 Getting collections...")
result = api_request("GET", f"/users/{USER_ID}/collections")
if result["status"] == 200:
    collections = result["data"]
    print(f"Found {len(collections)} collections")
    for col in collections[:3]:
        print(f"  - {col['data']['name']}")

# Get recent items
print("\n📚 Getting recent items...")
result = api_request("GET", f"/users/{USER_ID}/items?limit=5&sort=dateAdded&direction=desc")
if result["status"] == 200:
    items = result["data"]
    print(f"Found {len(items)} items")
    for item in items:
        if item["data"].get("title"):
            print(f"  - {item['data']['title']} ({item['data']['itemType']})")

print("\n✅ API connection successful!")
print("\nYou can communicate with Zotero at http://localhost:23119/api")