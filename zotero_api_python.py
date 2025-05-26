#!/usr/bin/env python3
"""
Zotero API Communication via localhost:23119
Python examples for interacting with your local Zotero library

Requirements: pip install requests
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE = "http://localhost:23119/api"
USER_ID = "0"  # Local library
HEADERS = {
    "Content-Type": "application/json",
    "Zotero-API-Version": "3"
}

class ZoteroAPI:
    """Simple Zotero API client for localhost communication"""
    
    def __init__(self, base_url=API_BASE, user_id=USER_ID):
        self.base_url = base_url
        self.user_id = user_id
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
    
    def get_collections(self):
        """Get all collections in the library"""
        response = self.session.get(f"{self.base_url}/users/{self.user_id}/collections")
        if response.status_code == 200:
            return response.json()
        return []
    
    def get_items(self, limit=10, sort="dateAdded", direction="desc", **params):
        """Get items from the library with optional filters"""
        params.update({
            "limit": limit,
            "sort": sort,
            "direction": direction
        })
        response = self.session.get(
            f"{self.base_url}/users/{self.user_id}/items",
            params=params
        )
        if response.status_code == 200:
            return response.json()
        return []
    
    def search_items(self, query):
        """Search for items by query"""
        return self.get_items(q=query)
    
    def get_items_by_tag(self, tag):
        """Get items with a specific tag"""
        return self.get_items(tag=tag)
    
    def create_item(self, item_data):
        """Create a new item (note, webpage, etc.)"""
        response = self.session.post(
            f"{self.base_url}/users/{self.user_id}/items",
            json=[item_data] if isinstance(item_data, dict) else item_data
        )
        return response.json() if response.status_code in [200, 201] else None
    
    def update_item(self, item_key, item_data, version):
        """Update an existing item"""
        headers = {"If-Unmodified-Since-Version": str(version)}
        response = self.session.patch(
            f"{self.base_url}/users/{self.user_id}/items/{item_key}",
            json=item_data,
            headers=headers
        )
        return response.status_code == 204
    
    def get_item_children(self, item_key):
        """Get attachments and notes for an item"""
        response = self.session.get(
            f"{self.base_url}/users/{self.user_id}/items/{item_key}/children"
        )
        if response.status_code == 200:
            return response.json()
        return []
    
    def add_tag_to_item(self, item_key, tag):
        """Add a tag to an item"""
        # First get the item
        response = self.session.get(
            f"{self.base_url}/users/{self.user_id}/items/{item_key}"
        )
        if response.status_code != 200:
            return False
        
        item = response.json()
        version = response.headers.get("Last-Modified-Version")
        
        # Add the tag
        if "tags" not in item["data"]:
            item["data"]["tags"] = []
        
        if not any(t["tag"] == tag for t in item["data"]["tags"]):
            item["data"]["tags"].append({"tag": tag, "type": 0})
            return self.update_item(item_key, item["data"], version)
        
        return True

def demo_basic_operations():
    """Demonstrate basic API operations"""
    api = ZoteroAPI()
    
    print("🔍 Zotero API Demo - Localhost Communication")
    print("=" * 50)
    
    # Get collections
    print("\n📁 Collections:")
    collections = api.get_collections()
    for col in collections[:5]:
        print(f"  - {col['data']['name']} ({col['key']})")
    
    # Get recent items
    print("\n📚 Recent Items:")
    items = api.get_items(limit=5)
    for item in items:
        data = item["data"]
        if data.get("title"):
            print(f"  - {data['title']} ({data['itemType']})")
    
    # Search
    print("\n🔍 Searching for 'learning':")
    results = api.search_items("learning")
    print(f"  Found {len(results)} items")
    
    # Check archived items
    print("\n🏷️ Items with 'archived' tag:")
    archived = api.get_items_by_tag("archived")
    for item in archived[:3]:
        data = item["data"]
        if data.get("title"):
            print(f"  - {data['title']}")

def demo_moment_integration():
    """Demonstrate Moment-o7 related operations"""
    api = ZoteroAPI()
    
    print("\n🗄️ Moment-o7 Integration Examples")
    print("=" * 50)
    
    # Find items with moments
    moment_items = api.get_items_by_tag("moment")
    print(f"\nFound {len(moment_items)} items with moments")
    
    for item in moment_items[:2]:
        data = item["data"]
        print(f"\n📄 {data.get('title', 'Untitled')}")
        print(f"   Key: {item['key']}")
        print(f"   URL: {data.get('url', 'No URL')}")
        
        # Check for archive data in extra field
        if data.get("extra"):
            if "Archived at:" in data["extra"]:
                print("   ✅ Has archive data in extra field")
        
        # Get children (notes/attachments)
        children = api.get_item_children(item["key"])
        notes = [c for c in children if c["data"]["itemType"] == "note"]
        if notes:
            print(f"   📝 Has {len(notes)} note(s)")

def create_test_webpage():
    """Create a test webpage item that could be archived"""
    api = ZoteroAPI()
    
    print("\n📝 Creating Test Webpage Item")
    print("=" * 50)
    
    webpage = {
        "itemType": "webpage",
        "title": "Test Article for Archiving",
        "creators": [
            {
                "creatorType": "author",
                "firstName": "API",
                "lastName": "Test"
            }
        ],
        "abstractNote": "This is a test webpage created via the Zotero API",
        "websiteTitle": "Example Website",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "url": "https://example.com/test-article",
        "accessDate": datetime.now().strftime("%Y-%m-%d"),
        "tags": [
            {"tag": "api-created", "type": 0},
            {"tag": "test", "type": 0}
        ]
    }
    
    result = api.create_item(webpage)
    if result and result.get("successful"):
        key = result["successful"][0]["key"]
        print(f"✅ Created webpage with key: {key}")
        print(f"   Title: {webpage['title']}")
        print(f"   URL: {webpage['url']}")
        print("\n   You can now right-click this item in Zotero and use")
        print("   'Archive to...' to test the Moment-o7 plugin!")
        return key
    else:
        print("❌ Failed to create webpage")
        return None

def main():
    """Run all demonstrations"""
    print("\n" + "=" * 60)
    print("Zotero Python API Examples")
    print("=" * 60)
    print(f"API Endpoint: {API_BASE}")
    print("Make sure Zotero is running and API is enabled!\n")
    
    try:
        # Test connection
        api = ZoteroAPI()
        test_response = api.session.get(f"{API_BASE}/users/{USER_ID}/collections")
        if test_response.status_code != 200:
            raise Exception("Cannot connect to Zotero API")
        
        # Run demos
        demo_basic_operations()
        demo_moment_integration()
        create_test_webpage()
        
        print("\n✅ All examples completed successfully!")
        print("\nNext steps:")
        print("1. Use these examples to build your own scripts")
        print("2. Check the created test item in Zotero")
        print("3. Try archiving it with the Moment-o7 plugin")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Is Zotero running?")
        print("2. In Preferences → Advanced → General")
        print("   Enable 'Allow other applications to communicate with Zotero'")
        print("3. Make sure you have 'requests' installed: pip install requests")

if __name__ == "__main__":
    main()