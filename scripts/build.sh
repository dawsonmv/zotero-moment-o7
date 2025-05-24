#!/bin/bash
# Build script for zotero-moment-o7 plugin

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${YELLOW}Building zotero-moment-o7 plugin...${NC}"

# Change to project directory
cd "$PROJECT_DIR"

# Remove old build
if [ -f "zotero-moment-o7.xpi" ]; then
    rm -f zotero-moment-o7.xpi
    echo "Removed old XPI file"
fi

# Create XPI (excluding unnecessary files)
zip -r zotero-moment-o7.xpi . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "scripts/*" \
    -x "*.md" \
    -x "*.xpi" \
    -x "node_modules/*" \
    -x ".vscode/*" \
    -x "logs/*" \
    -x "tests/*" \
    -x "docs/*"

if [ -f "zotero-moment-o7.xpi" ]; then
    echo -e "${GREEN}✓ Successfully built zotero-moment-o7.xpi${NC}"
    echo "Location: $PROJECT_DIR/zotero-moment-o7.xpi"
else
    echo -e "${RED}✗ Failed to build XPI file${NC}"
    exit 1
fi