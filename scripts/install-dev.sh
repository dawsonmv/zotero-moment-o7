#!/bin/bash
# Install plugin in development mode using symbolic link

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PLUGIN_ID="zotero-moment-o7@github.com"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${YELLOW}Installing zotero-moment-o7 in development mode...${NC}"

# Find Zotero profile directory - try multiple locations
PROFILE_FOUND=false

# Check for custom dev profile first
if [ -d "$HOME/ZoteroDevProfile" ]; then
    PROFILE_DIR="$HOME/ZoteroDevProfile"
    PROFILE_FOUND=true
# Check standard Zotero profile location on macOS
elif [ -d "$HOME/Library/Application Support/Zotero/Profiles" ]; then
    # Look for any profile directory
    for dir in "$HOME/Library/Application Support/Zotero/Profiles"/*; do
        if [ -d "$dir" ] && [ -f "$dir/prefs.js" ]; then
            PROFILE_DIR="$dir"
            PROFILE_FOUND=true
            break
        fi
    done
fi

if [ "$PROFILE_FOUND" = false ]; then
    echo -e "${RED}Error: Could not find Zotero profile directory${NC}"
    echo "Please create a development profile first using:"
    echo '  /Applications/"Zotero Beta.app"/Contents/MacOS/zotero -P'
    echo ""
    echo "Create a profile named 'ZoteroDev' in location: $HOME/ZoteroDevProfile"
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