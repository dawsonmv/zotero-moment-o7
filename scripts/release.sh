#!/bin/bash
# Release script for zotero-moment-o7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version from manifest.json
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)

if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Could not extract version from manifest.json${NC}"
    exit 1
fi

echo -e "${BLUE}Preparing release for Zotero Moment-o7 v${VERSION}${NC}"

# Ensure we're on master branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "master" ] && [ "$BRANCH" != "main" ]; then
    echo -e "${RED}Error: Not on master/main branch. Current branch: $BRANCH${NC}"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull

# Build the XPI
echo -e "${YELLOW}Building XPI...${NC}"
./scripts/build.sh

if [ ! -f "zotero-moment-o7.xpi" ]; then
    echo -e "${RED}Error: XPI build failed${NC}"
    exit 1
fi

# Create git tag
TAG="v${VERSION}"
echo -e "${YELLOW}Creating git tag ${TAG}...${NC}"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
    echo -e "${RED}Error: Tag ${TAG} already exists${NC}"
    exit 1
fi

# Create annotated tag
git tag -a "$TAG" -m "Release version ${VERSION}

## Changes in this version:
- Complete rewrite for Zotero 7 compatibility
- Migrated from XUL to Bootstrap architecture
- Replaced XMLHttpRequest with Zotero.HTTP.request
- Removed cors-anywhere dependency
- Added Fluent localization support
- Improved error handling and notifications

## Installation:
Download zotero-moment-o7.xpi and install via Tools → Add-ons in Zotero 7

## Known Issues:
- Archive.is support removed due to CORS limitations
- Minor manifest warning (does not affect functionality)"

# Push tag
echo -e "${YELLOW}Pushing tag to GitHub...${NC}"
git push origin "$TAG"

# Create release notes file
cat > RELEASE_NOTES.md << EOF
# Zotero Moment-o7 v${VERSION}

## 🎉 First Release for Zotero 7!

This is a complete rewrite of the classic Zotero Memento plugin, now fully compatible with Zotero 7.

### ✨ What's New
- **Zotero 7 Compatible**: Built using the new Bootstrap architecture
- **Modern Codebase**: Async/await patterns, proper error handling
- **Improved Performance**: Using Zotero.HTTP.request for better reliability
- **Better UX**: Clear notifications for archiving progress and errors

### 🔧 Technical Changes
- Migrated from XUL overlay to Bootstrap plugin architecture
- Replaced XMLHttpRequest with Zotero.HTTP.request API
- Removed deprecated cors-anywhere proxy dependency
- Implemented Fluent localization system
- Added comprehensive window management to prevent memory leaks

### 📦 Installation
1. Download \`zotero-moment-o7.xpi\` from the releases page
2. In Zotero 7: Tools → Add-ons
3. Click gear icon → Install Add-on From File
4. Select the downloaded XPI file
5. Restart Zotero

### 🚀 Features
- **Automatic Archiving**: Saves pages to Internet Archive when adding items via Browser Connector
- **Manual Archiving**: Right-click any item → "Archive this Resource"
- **Robust Links**: Creates notes with archival metadata
- **ORCID Support**: Extracts author ORCID profiles (for Signposting-enabled sites)
- **Enhanced Export**: Modified translators include archival information

### ⚠️ Known Limitations
- Archive.is support has been removed due to CORS restrictions
- Minor manifest warning in console (does not affect functionality)

### 🐛 Bug Reports
Please report issues at: https://github.com/dawsonmv/zotero-moment-o7/issues

### 🙏 Credits
- Original Zotero Memento plugin by Leon Tran
- Continued development by Harding Center for Risk Literacy
- Zotero 7 migration by contributors

---
**Full Changelog**: https://github.com/dawsonmv/zotero-moment-o7/compare/v1.1.1...v${VERSION}
EOF

echo -e "${GREEN}✓ Tag created and pushed${NC}"
echo -e "${GREEN}✓ Release notes generated in RELEASE_NOTES.md${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Go to: https://github.com/dawsonmv/zotero-moment-o7/releases/new"
echo "2. Select tag: ${TAG}"
echo "3. Title: Zotero Moment-o7 v${VERSION}"
echo "4. Copy contents from RELEASE_NOTES.md"
echo "5. Attach: zotero-moment-o7.xpi"
echo "6. Check 'Set as the latest release'"
echo "7. Publish release"