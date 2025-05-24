# Zotero 7 Development Environment Setup

This guide will help you set up a complete development environment for Zotero 7 plugin development.

## 1. Download and Install Zotero 7 Beta

### Option A: Download Pre-built Beta
1. Visit https://www.zotero.org/support/beta_builds
2. Download the Zotero 7 beta for your operating system (macOS in this case)
3. Install to a different location than your main Zotero installation (e.g., `/Applications/Zotero Beta.app`)

### Option B: Download Specific Version
1. Visit https://www.zotero.org/download/client/dl?channel=beta&platform=mac
2. This will download the latest beta version

## 2. Create a Development Profile

To keep your development work separate from your main Zotero library:

```bash
# Create a new profile for development
/Applications/Zotero\ Beta.app/Contents/MacOS/zotero -P
```

This opens the Profile Manager:
1. Click "Create Profile"
2. Name it "ZoteroDev" or similar
3. Choose a custom location (e.g., `~/ZoteroDevProfile`)
4. Finish the wizard

## 3. Launch Zotero with Development Profile

Create a launch script for easy access:

```bash
# Create a launch script
cat > ~/zotero-dev.sh << 'EOF'
#!/bin/bash
/Applications/Zotero\ Beta.app/Contents/MacOS/zotero -P ZoteroDev -purgecaches -jsconsole
EOF

chmod +x ~/zotero-dev.sh
```

Launch options explained:
- `-P ZoteroDev`: Use the development profile
- `-purgecaches`: Clear caches on startup (useful for development)
- `-jsconsole`: Open the JavaScript console

## 4. Enable Developer Tools

1. Launch Zotero with your dev profile
2. Go to Edit → Preferences → Advanced
3. Check "Enable Developer Tools"
4. Restart Zotero

## 5. Set Up Plugin Development Structure

Create a development directory structure:

```bash
mkdir -p ~/zotero-dev/plugins
cd ~/zotero-dev/plugins
ln -s ~/zotero-plugin-repos/zotero-moment-o7 .
```

## 6. Install the Plugin in Development Mode

### Method 1: Symbolic Link (Recommended for Development)
```bash
# Find your Zotero profile directory
cd ~/ZoteroDevProfile/extensions
# Create a text file with the plugin ID containing the path to your plugin
echo "/Users/dawsonvaldes/zotero-plugin-repos/zotero-moment-o7" > zotero_memento@zotero.org
```

### Method 2: Install XPI
Build and install the XPI file through Zotero's Tools → Add-ons menu

## 7. Development Tools Setup

### JavaScript Debugging
1. In Zotero, go to Tools → Developer → Run JavaScript
2. This opens an editor where you can test code with access to the Zotero object

### Error Console
- Tools → Developer → Error Console
- Shows all JavaScript errors and debug output

### Inspector
- Tools → Developer → Inspector
- Allows you to inspect and modify the Zotero UI

## 8. Useful Development Preferences

Set these in Edit → Preferences → Advanced → Config Editor:

```javascript
// Enable debug output
extensions.zotero.debug.log = true
extensions.zotero.debug.level = 5
extensions.zotero.debug.time = true

// Disable automatic updates during development
app.update.enabled = false
extensions.update.enabled = false

// Show hidden preferences
browser.preferences.advanced = true
```

## 9. VS Code Integration (Optional)

Install helpful extensions:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension firefox-devtools.vscode-firefox-debug
```

Create `.vscode/launch.json` for debugging:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Zotero Debug",
            "type": "firefox",
            "request": "launch",
            "reAttach": true,
            "file": "${workspaceFolder}/bootstrap.js",
            "preferences": {
                "extensions.zotero.debug.log": true
            }
        }
    ]
}
```

## 10. Quick Development Workflow

1. Make changes to your plugin code
2. In Zotero: Tools → Developer → Restart with Logging Enabled
3. Test your changes
4. Check Error Console for issues
5. Use Run JavaScript for quick tests

## 11. Building the Plugin

Create a build script:

```bash
#!/bin/bash
# build.sh
cd /Users/dawsonvaldes/zotero-plugin-repos/zotero-moment-o7
rm -f zotero-moment-o7.xpi
zip -r zotero-moment-o7.xpi . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "build.sh" \
    -x "*.md" \
    -x "make-it-red/*" \
    -x "*.xpi"
echo "Built zotero-moment-o7.xpi"
```

## 12. Testing Checklist

- [ ] Plugin loads without errors
- [ ] Check Error Console for warnings
- [ ] Test with a fresh profile
- [ ] Test upgrade from old version
- [ ] Test on different operating systems (if possible)

## Common Issues and Solutions

### Plugin Not Loading
- Check the plugin ID matches in all files
- Verify file permissions
- Check Error Console for specific errors

### Changes Not Reflected
- Use -purgecaches flag
- Restart Zotero completely
- Check if you're editing the right files

### JavaScript Errors
- Use the Error Console
- Add debug logging: `Zotero.debug("My debug message");`
- Use try-catch blocks during development

## Next Steps

1. Start with creating `manifest.json`
2. Create minimal `bootstrap.js`
3. Test basic loading
4. Incrementally add features

## Resources

- Zotero 7 Developer Docs: https://www.zotero.org/support/dev/zotero_7_for_developers
- Zotero Forums Dev Category: https://forums.zotero.org/categories/dev
- Sample Plugin: https://github.com/zotero/make-it-red