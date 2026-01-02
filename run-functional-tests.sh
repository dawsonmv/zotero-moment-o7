#!/bin/bash

# Functional Testing Helper for Moment-o7
# This script prepares the plugin for functional testing in Zotero

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
XPI_FILE="$PROJECT_DIR/.scaffold/build/moment-o-7.xpi"
ZOTERO_APP="/Applications/Zotero.app"
ZOTERO_DATA="$HOME/Zotero"

echo "🧪 Moment-o7 Functional Testing Setup"
echo "======================================"
echo ""

# Check if Zotero is installed
if [ ! -d "$ZOTERO_APP" ]; then
  echo "❌ Zotero not found at $ZOTERO_APP"
  echo "Please install Zotero 7 from https://www.zotero.org"
  exit 1
fi

echo "✅ Zotero found at: $ZOTERO_APP"
echo ""

# Check if XPI is built
if [ ! -f "$XPI_FILE" ]; then
  echo "📦 Building plugin..."
  cd "$PROJECT_DIR"
  npm run build
  echo "✅ Plugin built"
  echo ""
fi

echo "📋 Plugin Status:"
echo "  XPI file: $XPI_FILE"
ls -lh "$XPI_FILE"
echo ""

echo "📖 Testing Instructions:"
echo "=================================="
echo ""
echo "1. Open Zotero:"
echo "   $ open /Applications/Zotero.app"
echo ""
echo "2. Install the plugin:"
echo "   - Tools → Add-ons"
echo "   - Click ⚙️ gear icon"
echo "   - Select 'Install Add-on From File...'"
echo "   - Choose: $XPI_FILE"
echo "   - Restart Zotero"
echo ""
echo "3. Add test items to your library:"
echo "   - Add 10-15 items with URLs (web pages, articles, etc)"
echo "   - Mix of simple pages and complex sites recommended"
echo ""
echo "4. Follow TESTING_CHECKLIST.md:"
echo "   - 12 testing phases"
echo "   - Approximately 1-3 hours total"
echo "   - Check off items as you complete them"
echo ""
echo "5. Critical tests to focus on:"
echo "   ✅ Phase 1: Plugin loads successfully"
echo "   ✅ Phase 2: Single item archiving works"
echo "   ✅ Phase 3: Batch archiving (10+ items)"
echo "   ✅ Phase 4: Traffic monitoring shows scores"
echo "   ✅ Phase 5: Service jamming detection"
echo "   ✅ Phase 9: Error handling (no crashes)"
echo "   ✅ Phase 10: Performance (50+ items)"
echo "   ✅ Phase 12: Stability (multiple batches)"
echo ""
echo "6. View Zotero debug console:"
echo "   - Help → Debug Output Logging"
echo "   - Watch for errors during testing"
echo "   - Look for '[Moment-o7]' log messages"
echo ""
echo "=================================="
echo ""
echo "📊 Quick Testing Summary:"
echo "  Time: 1-3 hours"
echo "  Phases: 12 total"
echo "  Items needed: 10-50"
echo "  Risk: LOW (read-only archiving, no data loss)"
echo ""
echo "✅ Ready to test!"
echo ""
echo "💡 Tip: Open both this terminal and Zotero side-by-side"
echo "       for easy reference to TESTING_CHECKLIST.md"
echo ""
