#!/bin/bash
# Launch Zotero Beta with development profile

ZOTERO_PATH="/Applications/Zotero Beta.app/Contents/MacOS/zotero"
PROFILE_NAME="ZoteroDev"

# Check if Zotero Beta exists
if [ ! -f "$ZOTERO_PATH" ]; then
    echo "Error: Zotero Beta not found at $ZOTERO_PATH"
    echo "Please install Zotero Beta first from: https://www.zotero.org/support/beta_builds"
    exit 1
fi

# Launch with development flags
echo "Launching Zotero Beta with profile: $PROFILE_NAME"
"$ZOTERO_PATH" -P "$PROFILE_NAME" -purgecaches -jsconsole