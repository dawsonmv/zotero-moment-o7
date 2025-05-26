#!/bin/bash
# Simple build script for Zotero Moment-o7 KISS version

echo "Building Zotero Moment-o7 KISS version..."

# Clean up
rm -rf build-simple
rm -f zotero-moment-o7-kiss.xpi

# Create build directory
mkdir -p build-simple/addon/content
mkdir -p build-simple/src
mkdir -p build-simple/locale/en-US

# Copy files
cp manifest-simple.json build-simple/manifest.json
cp bootstrap-simple.js build-simple/bootstrap.js
cp chrome.manifest build-simple/
cp icon*.png build-simple/
cp src/momento7-simple.js build-simple/src/
cp addon/content/preferences-simple.xhtml build-simple/addon/content/preferences-simple.xhtml
cp addon/prefs-simple.js build-simple/addon/prefs.js
cp locale/en-US/moment-o7.ftl build-simple/locale/en-US/

# Create XPI
cd build-simple
zip -r ../zotero-moment-o7-kiss.xpi . -x "*.DS_Store"
cd ..

echo "✓ Built zotero-moment-o7-kiss.xpi"
echo ""
echo "📊 KISS Version Statistics:"
echo "- Files: $(find build-simple -type f | wc -l | tr -d ' ') (vs 50+ in original)"
echo "- Lines of code: $(find build-simple -name "*.js" -o -name "*.xhtml" | xargs wc -l | tail -1 | awk '{print $1}') (vs 3000+ in original)"
echo "- Size: $(ls -lh zotero-moment-o7-kiss.xpi | awk '{print $5}')"