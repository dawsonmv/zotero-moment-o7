#!/bin/bash
# Build script for zotero-moment-o7 plugin
# Note: Run 'npm run build:ts' first to compile TypeScript

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

# Create build directory if it doesn't exist
mkdir -p build

# Copy non-TypeScript files to build directory
echo "Copying static files to build directory..."
cp manifest.json build/
cp update.json build/
cp icon*.png build/
cp chrome.manifest build/

# Copy source structure
echo "Copying source files..."
mkdir -p build/src
cp -r src/core build/src/
cp -r src/services build/src/
cp -r src/features build/src/
cp -r src/ui build/src/
cp -r src/translators build/src/

# Copy addon files
cp -r addon build/

# Copy worker files (if needed for distribution)
mkdir -p build/worker
cp -r worker/* build/worker/

# Remove old build
if [ -f "zotero-moment-o7.xpi" ]; then
    rm -f zotero-moment-o7.xpi
    echo "Removed old XPI file"
fi

# Create XPI from build directory
cd build
zip -r ../zotero-moment-o7.xpi . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "*.map"
cd ..

if [ -f "zotero-moment-o7.xpi" ]; then
    echo -e "${GREEN}✓ Successfully built zotero-moment-o7.xpi${NC}"
    echo "Location: $PROJECT_DIR/zotero-moment-o7.xpi"
else
    echo -e "${RED}✗ Failed to build XPI file${NC}"
    exit 1
fi