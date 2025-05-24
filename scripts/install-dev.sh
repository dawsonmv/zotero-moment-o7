#!/bin/bash
# Install plugin in development mode using symbolic link

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PLUGIN_ID="zotero_memento@zotero.org"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${YELLOW}Installing zotero-moment-o7 in development mode...${NC}"

# Find Zotero profile directory
if [ -d "$HOME/ZoteroDevProfile" ]; then
    PROFILE_DIR="$HOME/ZoteroDevProfile"
elif [ -d "$HOME/Library/Application Support/Zotero/Profiles/"*".default" ]; then
    PROFILE_DIR=$(ls -d "$HOME/Library/Application Support/Zotero/Profiles/"*".default" | head -1)
else
    echo -e "${RED}Error: Could not find Zotero profile directory${NC}"
    echo "Please create a development profile first using:"
    echo "  /Applications/Zotero\ Beta.app/Contents/MacOS/zotero -P"
    exit 1
fi

# Create extensions directory if it doesn't exist
EXTENSIONS_DIR="$PROFILE_DIR/extensions"
mkdir -p "$EXTENSIONS_DIR"

# Create pointer file
POINTER_FILE="$EXTENSIONS_DIR/$PLUGIN_ID"
echo "$PROJECT_DIR" > "$POINTER_FILE"

if [ -f "$POINTER_FILE" ]; then
    echo -e "${GREEN}✓ Successfully installed in development mode${NC}"
    echo "Profile: $PROFILE_DIR"
    echo "Plugin location: $PROJECT_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Restart Zotero"
    echo "2. Check Tools → Add-ons to verify installation"
else
    echo -e "${RED}✗ Failed to create pointer file${NC}"
    exit 1
fi