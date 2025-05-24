# Quick Start Guide for Zotero 7 Development

## Prerequisites
1. Download Zotero 7 Beta from: https://www.zotero.org/support/beta_builds
2. Install to `/Applications/Zotero Beta.app`

## First Time Setup (5 minutes)

### 1. Create Development Profile
```bash
/Applications/Zotero\ Beta.app/Contents/MacOS/zotero -P
```
- Click "Create Profile"
- Name: "ZoteroDev"
- Location: ~/ZoteroDevProfile

### 2. Install Plugin in Dev Mode
```bash
cd /Users/dawsonvaldes/zotero-plugin-repos/zotero-moment-o7
./scripts/install-dev.sh
```

### 3. Launch Zotero Dev Environment
```bash
./scripts/zotero-dev.sh
```

## Daily Development Workflow

### Starting Work
1. Launch Zotero: `./scripts/zotero-dev.sh`
2. Open Error Console: Tools → Developer → Error Console
3. Make code changes in VS Code

### Testing Changes
- Quick restart: Tools → Developer → Restart with Logging Enabled
- Full restart: Quit and run `./scripts/zotero-dev.sh` again

### Building XPI
```bash
./scripts/build.sh
```

## Key Locations
- **Plugin code**: Current directory
- **Profile**: ~/ZoteroDevProfile
- **Extensions**: ~/ZoteroDevProfile/extensions
- **Error logs**: Tools → Developer → Error Console

## Debugging Tips
1. Add debug output: `Zotero.debug("My message");`
2. Use Run JavaScript: Tools → Developer → Run JavaScript
3. Check Error Console frequently
4. Use `-purgecaches` flag if changes aren't showing

## Common Commands
```bash
# Launch Zotero with dev profile
./scripts/zotero-dev.sh

# Build XPI
./scripts/build.sh

# Install in dev mode
./scripts/install-dev.sh

# Check logs
tail -f ~/ZoteroDevProfile/zotero.log
```

## Next Steps for Migration
1. ✓ Set up development environment
2. → Create manifest.json
3. → Create bootstrap.js
4. → Test basic loading
5. → Migrate functionality