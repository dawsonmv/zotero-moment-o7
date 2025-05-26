#!/bin/bash
# Open Zotero with debug console

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Zotero with debug console...${NC}"

# Find Zotero installation
if [ -d "/Applications/Zotero Beta.app" ]; then
    ZOTERO_APP="/Applications/Zotero Beta.app"
elif [ -d "/Applications/Zotero.app" ]; then
    ZOTERO_APP="/Applications/Zotero.app"
else
    echo -e "${RED}Error: Zotero not found in /Applications${NC}"
    exit 1
fi

echo "Found Zotero at: $ZOTERO_APP"
echo ""
echo -e "${GREEN}To open the debug console in Zotero:${NC}"
echo "1. Go to Tools → Developer → Error Console"
echo "2. Or press Ctrl+Shift+J (Cmd+Shift+J on Mac)"
echo ""
echo "To test the plugin in the console, try:"
echo "  Zotero.MomentO7"
echo "  Zotero.MomentO7.ServiceRegistry.list()"
echo ""

# Start Zotero with debug output
"$ZOTERO_APP/Contents/MacOS/zotero" -purgecaches -console