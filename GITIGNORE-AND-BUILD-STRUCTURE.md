# Git Ignore & Build Directory Structure

**Status:** ✅ Fixed and Optimized
**Date:** 2026-01-02
**Commit:** f0ee0df

---

## 📋 Summary

The .gitignore has been improved to properly handle all generated files while maintaining clean repository structure. Public build directories have been created for managing releases.

---

## 🗂️ Directory Structure

### Build Directories (NOT tracked)

```
.scaffold/              ← Development builds (auto-generated)
├── build/
│   ├── moment-o-7.xpi       (auto-generated, ignored)
│   ├── update.json          (auto-generated, ignored)
│   └── update-beta.json     (auto-generated, ignored)
└── ...                 (all ignored by .gitignore)
```

### Public Directories (TRACKED with content ignored)

```
releases/               ← Official release builds (structure tracked)
├── README.md          ✅ (tracked - documents releases)
└── .gitkeep           ✅ (tracked - keeps directory in git)
    [*.xpi files]      ❌ (ignored - not tracked)

dist/                  ← Public distribution builds (structure tracked)
├── README.md          ✅ (tracked - documents purpose)
└── [build files]      ❌ (ignored - not tracked)
```

---

## 🎯 What Gets Tracked vs. Ignored

### ✅ WILL BE TRACKED (in git)

```
- releases/README.md       (explains release process)
- releases/.gitkeep        (keeps directory structure)
- dist/README.md           (explains distribution)
- All source code
- All documentation
- Configuration files
- Test files
```

### ❌ WILL NOT BE TRACKED (ignored)

```
- .scaffold/              (entire directory auto-generated)
- .scaffold/build/*.xpi   (plugin builds)
- dist/*                  (distribution files)
- releases/*              (release files, except READMEs)
- node_modules/           (dependencies)
- coverage/               (test coverage)
- *.log                   (log files)
- .DS_Store               (macOS)
- Thumbs.db               (Windows)
- Generated reports       (EXECUTIVE-SUMMARY.md, etc.)
```

---

## 📝 .gitignore Rules

### Build Artifacts

```
.scaffold/              # Development build directory
build/                  # Build output
out/                    # Output directory
*.xpi                   # Plugin archives (auto-generated)
dist/*                  # Distribution files
releases/*              # Release files
```

### Node.js

```
node_modules            # Dependencies
pnpm-lock.yaml          # Lock file
yarn.lock               # Lock file
npm-debug.log*          # Debug logs
```

### Test Coverage

```
coverage                # Coverage reports
.nyc_output             # NYC coverage output
```

### IDE & OS

```
.vscode/                # VS Code settings
.idea/                  # IntelliJ settings
*.swp, *.swo, *~        # Editor temp files
.DS_Store               # macOS
Thumbs.db               # Windows
```

### Generated Reports

```
EXECUTIVE-SUMMARY.md
METRICS-DASHBOARD.md
REPORTING-INDEX.md
TASK-HEALTH-SNAPSHOT.txt
TASK-MANAGEMENT-HEALTH-REPORT.md
DEPENDENCY-HEALTH-REPORT.md
```

---

## 🔄 Development Workflow

### Building (Development)

```bash
npm run build
# Creates: .scaffold/build/moment-o-7.xpi
# Status: Not tracked (auto-generated)
# Usage: For local testing
```

### Creating Release (Production)

```bash
# After functional testing passes:
1. Copy plugin from: .scaffold/build/moment-o-7.xpi
2. Copy to: releases/v1.0.0/moment-o-7.xpi
3. Add to git: git add releases/v1.0.0/
4. Commit with version tag
5. Push to GitHub
6. GitHub creates Release with downloadable .xpi
```

### Distribution

```
Public builds:
releases/v1.0.0/moment-o-7.xpi     ← Tracked in git
dist/                               ← May be used for other builds
.scaffold/build/moment-o-7.xpi      ← Local development only
```

---

## ✅ Benefits of This Structure

**Clean Repository:**

- Only source code and documentation tracked
- No auto-generated files cluttering git history
- Smaller repository size
- Cleaner `git status` output

**Clear Separation:**

- Development builds: `.scaffold/` (local only)
- Public releases: `releases/` (tracked in git)
- Distribution: `dist/` (flexible use)

**Proper Release Management:**

- Versioned builds tracked in `releases/`
- Easy to find historical versions
- Clear download path for users

**Git Hygiene:**

- `git status` shows only actual changes
- No confusion about what's tracked
- Smaller diffs for commits

---

## 🚀 Example Workflow

### 1. During Development

```bash
# Run build (creates .scaffold/build/moment-o-7.xpi)
npm run build

# .gitignore ignores it
git status
# Shows clean (no .scaffold files)
```

### 2. After Testing Passes

```bash
# Create release directory
mkdir -p releases/v1.0.0

# Copy plugin to releases
cp .scaffold/build/moment-o-7.xpi releases/v1.0.0/

# Track in git
git add releases/v1.0.0/moment-o-7.xpi
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin main --tags

# GitHub automatically creates Release page with downloadable .xpi
```

### 3. User Downloads

```
User visits: https://github.com/[user]/zotero-momento7-new/releases
Downloads: moment-o-7.xpi (from GitHub Release)
```

---

## 📊 Current Status

```
Working Directory Status:
✅ .gitignore: Properly configured
✅ releases/: Directory created and tracked
✅ dist/: Directory created and tracked
✅ .scaffold/: Auto-generated, properly ignored
✅ No untracked files (except auto-generated builds)

Git Status:
✅ No generated files in working tree
✅ Only source changes to track
✅ Clean status output
```

---

## 🔍 Verification

### Check What's Tracked

```bash
git ls-files | grep -E "releases|dist"
# Shows:
# dist/README.md
# releases/.gitkeep
# releases/README.md
```

### Check What's Ignored

```bash
# These don't appear in git
.scaffold/build/moment-o-7.xpi
releases/v1.0.0/moment-o-7.xpi
dist/moment-o-7.xpi
```

### View Active Rules

```bash
cat .gitignore
# Shows comprehensive ignore patterns
```

---

## 📋 Maintenance

### Keep .gitignore Updated

If new auto-generated files appear:

1. Add pattern to `.gitignore`
2. Run: `git rm --cached <file>` (if already tracked)
3. Commit: `git add .gitignore && git commit`

### Monitor for Untracked Files

```bash
# Check for anything that shouldn't be there
git status

# Should show clean working tree
# (except .scaffold/ build artifacts locally)
```

---

## 🎯 Summary

| Item         | Status      | Notes                         |
| ------------ | ----------- | ----------------------------- |
| .gitignore   | ✅ Fixed    | Comprehensive ignore patterns |
| releases/    | ✅ Created  | For versioned releases        |
| dist/        | ✅ Created  | For public distribution       |
| .scaffold/   | ✅ Ignored  | Development builds only       |
| Clean status | ✅ Achieved | No untracked generated files  |
| Release path | ✅ Ready    | releases/vX.Y.Z/moment-o7.xpi |

---

**Status:** ✅ **GITIGNORE FIXED & BUILD STRUCTURE READY**

Repository is clean and properly organized for development and releases.
