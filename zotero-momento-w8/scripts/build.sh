#!/bin/bash
# Build script for zotero-momento-w8
# Zips the plugin files directly into an installable XPI.
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
XPI_NAME="zotero-momento-w8.xpi"

cd "$PROJECT_DIR"

rm -f "$XPI_NAME"

zip -r "$XPI_NAME" \
    manifest.json \
    bootstrap.js \
    prefs.js \
    icon48.png \
    icon96.png \
    content \
    locale \
    src \
    -x "*.DS_Store"

echo "Built $PROJECT_DIR/$XPI_NAME"
