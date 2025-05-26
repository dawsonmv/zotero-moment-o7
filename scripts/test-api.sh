#!/bin/bash
# Test Zotero API connection

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_ENDPOINT="http://localhost:23119/api"

echo -e "${YELLOW}Testing Zotero API connection at $API_ENDPOINT${NC}"
echo ""

# Test basic connection
echo "Testing API endpoint..."
response=$(curl -s -w "\n%{http_code}" "$API_ENDPOINT/users/0/items?limit=1" -H "Zotero-API-Version: 3")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ API is accessible${NC}"
    echo ""
    
    # Count items
    item_count=$(echo "$body" | grep -o '"key"' | wc -l | tr -d ' ')
    echo "Found $item_count item(s) in library"
    
    # Test creating a test note
    echo ""
    echo "Testing write access..."
    test_note='{
        "itemType": "note",
        "note": "<p>Test note from Moment-o7 API test</p>",
        "tags": [{"tag": "test", "type": 0}]
    }'
    
    write_response=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT/users/0/items" \
        -H "Content-Type: application/json" \
        -H "Zotero-API-Version: 3" \
        -d "[$test_note]")
    write_code=$(echo "$write_response" | tail -n1)
    
    if [ "$write_code" = "200" ] || [ "$write_code" = "201" ]; then
        echo -e "${GREEN}✓ Write access confirmed${NC}"
    else
        echo -e "${RED}✗ Write access failed (HTTP $write_code)${NC}"
    fi
    
else
    echo -e "${RED}✗ API is not accessible (HTTP $http_code)${NC}"
    echo ""
    echo "Make sure:"
    echo "1. Zotero is running"
    echo "2. The Zotero API Server is enabled in Preferences → Advanced → Allow other applications to communicate with Zotero"
    echo "3. The API is listening on port 23119"
fi