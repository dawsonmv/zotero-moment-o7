#!/bin/bash
# Install the built XPI file in Zotero

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
XPI_FILE="$PROJECT_DIR/zotero-moment-o7.xpi"

echo -e "${YELLOW}Installing zotero-moment-o7.xpi...${NC}"

# Check if XPI file exists
if [ ! -f "$XPI_FILE" ]; then
    echo -e "${RED}Error: XPI file not found at $XPI_FILE${NC}"
    echo "Please run 'npm run build' first"
    exit 1
fi

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
echo "Installing XPI: $XPI_FILE"

# Open the XPI file with Zotero (this will prompt to install)
open -a "$ZOTERO_APP" "$XPI_FILE"

echo -e "${GREEN}✓ Opening Zotero to install the plugin${NC}"
echo ""
echo "Zotero will prompt you to install the add-on."
echo "Click 'Install' when prompted."