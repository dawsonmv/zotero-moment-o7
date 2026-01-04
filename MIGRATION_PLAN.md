# Zotero Moment-o7 Migration Plan

**Migration Type:** Incremental migration to zotero-plugin-template
**Source:** Current zotero-moment-o7 (9,874 LOC TypeScript, 685 tests passing)
**Target:** Fork of [windingwind/zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)
**Status:** Planning Complete - Ready to Execute

---

## Executive Summary

### Why Migrate?

| Issue        | Current State                        | Template Solution                  |
| ------------ | ------------------------------------ | ---------------------------------- |
| Build system | Webpack BROKEN (entry point missing) | esbuild via zotero-plugin-scaffold |
| Hot reload   | None                                 | `zotero-plugin serve`              |
| Localization | Hardcoded strings                    | Fluent (.ftl files)                |
| UI helpers   | Manual XUL creation                  | zotero-plugin-toolkit              |
| Type safety  | Custom zotero.d.ts                   | zotero-types package               |
| Lifecycle    | Manual notifier/window mgmt          | Clean hooks.ts pattern             |

### What to Keep (Domain Logic)

- `src/services/` - 5 archive services (InternetArchive, ArchiveToday, PermaCc, UKWebArchive, ArquivoPt)
- `src/memento/` - RFC 7089 Memento Protocol
- `src/utils/` - CircuitBreaker, Cache, HttpClient, CredentialManager
- `src/monitoring/` - Logger, Metrics, Tracer, HealthChecker
- `tests/` - 685 unit tests (90%+ coverage)

### Estimated Effort

| Phase                   | Duration       | Parallel? |
| ----------------------- | -------------- | --------- |
| Phase 1: Foundation     | 2-3 days       | No        |
| Phase 2: Domain Logic   | 3-4 days       | No        |
| Phase 3: UI/Preferences | 2-3 days       | No        |
| Phase 4: Testing        | 2-3 days       | Yes       |
| Phase 5: Polish         | 1-2 days       | Yes       |
| **Total**               | **10-15 days** |           |

---

## Phase 1: Foundation Setup (2-3 days)

### 1.1 Fork and Configure Template

```bash
# Fork template repo on GitHub
# Clone to local
git clone https://github.com/YOUR_USERNAME/zotero-momento7.git
cd zotero-momento7

# Update package.json
```

**package.json changes:**

```json
{
  "name": "zotero-moment-o7",
  "version": "1.0.0",
  "description": "Archive web resources to prevent link rot",
  "homepage": "https://github.com/dawsonmv/zotero-moment-o7",
  "author": "Harding Center for Risk Literacy",
  "license": "GPL-3.0",
  "config": {
    "addonName": "Moment-o7",
    "addonID": "momento7@example.com",
    "addonRef": "momento7",
    "addonInstance": "MomentO7"
  }
}
```

### 1.2 Configure Build (zotero-plugin.config.ts)

```typescript
import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json";

export default defineConfig({
  source: ["src", "addon"],
  dist: "build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/dawsonmv/zotero-moment-o7/releases/download/release/update.json`,
  xpiDownloadLink: `https://github.com/dawsonmv/zotero-moment-o7/releases/download/v{{version}}/{{xpiName}}.xpi`,
  build: {
    assets: ["addon/**/*"],
    define: {
      __AUTHOR__: JSON.stringify(pkg.author),
      __DESCRIPTION__: JSON.stringify(pkg.description),
      __VERSION__: JSON.stringify(pkg.version),
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        bundle: true,
        target: "firefox115",
      },
    ],
  },
  server: {
    startURL: "about:devtools-toolbox?id=momento7%40example.com&type=extension",
  },
});
```

### 1.3 Directory Structure

```
zotero-momento7/
├── addon/
│   ├── bootstrap.js          # From template (no changes)
│   ├── manifest.json         # Update metadata
│   ├── prefs.js              # Preference defaults
│   ├── content/
│   │   ├── preferences.xhtml # Preference UI
│   │   └── momento7.css      # Custom styles
│   └── locale/
│       ├── en-US/
│       │   └── addon.ftl     # English strings
│       └── de-DE/
│           └── addon.ftl     # German strings
├── src/
│   ├── index.ts              # Entry point
│   ├── addon.ts              # Addon class
│   ├── hooks.ts              # Lifecycle hooks
│   ├── modules/              # New home for domain logic
│   │   ├── archive/          # Archive services
│   │   ├── memento/          # Memento protocol
│   │   ├── monitoring/       # Observability
│   │   └── preferences/      # Settings management
│   └── utils/                # Shared utilities
├── test/                     # Migrated tests
├── typings/                  # Custom type declarations
└── zotero-plugin.config.ts   # Build configuration
```

### 1.4 Create Core Files

**src/index.ts:**

```typescript
import { Addon } from "./addon";
import { config } from "../package.json";

export default Addon;

export function createAddon(): Addon {
  return new Addon();
}

// Register global instance
if (!Zotero[config.addonInstance]) {
  Zotero[config.addonInstance] = createAddon();
}
```

**src/addon.ts:**

```typescript
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { config } from "../package.json";

class Addon {
  public data = {
    alive: true,
    config,
    env: __env__,
    initialized: false,
    ztoolkit: createZToolkit(),
    // Domain-specific data
    services: new Map(),
    circuitBreakers: new Map(),
  };
  public hooks = hooks;
  public api = {};
}

export { Addon };
```

---

## Phase 2: Domain Logic Migration (3-4 days)

### 2.1 Services Module

**File mapping:**

| Current                                  | New Location                              |
| ---------------------------------------- | ----------------------------------------- |
| `src/services/types.ts`                  | `src/modules/archive/types.ts`            |
| `src/services/BaseArchiveService.ts`     | `src/modules/archive/BaseService.ts`      |
| `src/services/InternetArchiveService.ts` | `src/modules/archive/internet-archive.ts` |
| `src/services/ArchiveTodayService.ts`    | `src/modules/archive/archive-today.ts`    |
| `src/services/PermaCCService.ts`         | `src/modules/archive/perma-cc.ts`         |
| `src/services/UKWebArchiveService.ts`    | `src/modules/archive/uk-web-archive.ts`   |
| `src/services/ArquivoPtService.ts`       | `src/modules/archive/arquivo-pt.ts`       |
| `src/services/ServiceRegistry.ts`        | `src/modules/archive/registry.ts`         |
| `src/services/ArchiveCoordinator.ts`     | `src/modules/archive/coordinator.ts`      |

**Changes needed:**

1. Update imports to use `zotero-types` instead of custom `zotero.d.ts`
2. Replace `Zotero.HTTP.request` calls with toolkit's HTTP helper
3. Update preference access to use new `PreferencesManager`

### 2.2 Memento Module

**File mapping:**

| Current                          | New Location                      |
| -------------------------------- | --------------------------------- |
| `src/memento/MementoProtocol.ts` | `src/modules/memento/protocol.ts` |
| `src/memento/MementoChecker.ts`  | `src/modules/memento/checker.ts`  |

**No major changes needed** - this module is self-contained.

### 2.3 Utils Module

**File mapping:**

| Current                          | New Location                   |
| -------------------------------- | ------------------------------ |
| `src/utils/Cache.ts`             | `src/utils/cache.ts`           |
| `src/utils/CircuitBreaker.ts`    | `src/utils/circuit-breaker.ts` |
| `src/utils/HttpClient.ts`        | `src/utils/http.ts`            |
| `src/utils/CredentialManager.ts` | `src/utils/credentials.ts`     |
| `src/utils/HtmlUtils.ts`         | `src/utils/html.ts`            |
| `src/utils/ProgressReporter.ts`  | `src/utils/progress.ts`        |

**Changes needed:**

1. Update `HttpClient` to use toolkit's wrapper
2. Update `ProgressReporter` to use toolkit's progress window

### 2.4 Monitoring Module

**File mapping:**

| Current               | New Location                  |
| --------------------- | ----------------------------- |
| `src/monitoring/*.ts` | `src/modules/monitoring/*.ts` |

**No major changes needed** - keep as-is initially.

---

## Phase 3: UI and Preferences (2-3 days)

### 3.1 Hooks Implementation

**src/hooks.ts:**

```typescript
import { config } from "../package.json";
import { getLocaleID, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferences/prefs";
import { ServiceRegistry } from "./modules/archive/registry";
import { ArchiveCoordinator } from "./modules/archive/coordinator";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  // Initialize services
  const registry = ServiceRegistry.getInstance();
  registry.init();

  // Register notifier for auto-archive
  registerNotifier();

  addon.data.initialized = true;
}

async function onMainWindowLoad(win: Window) {
  createZToolkit().UI.appendElement(
    {
      tag: "menuseparator",
      id: `${config.addonRef}-separator`,
    },
    win.document.getElementById("zotero-itemmenu")!,
  );

  createZToolkit().UI.appendElement(
    {
      tag: "menu",
      id: `${config.addonRef}-menu`,
      attributes: { label: getString("menu-archive") },
      children: [
        {
          tag: "menupopup",
          children: [
            {
              tag: "menuitem",
              attributes: { label: getString("menu-ia") },
              listeners: [
                {
                  type: "command",
                  listener: () => archiveSelected("internetarchive"),
                },
              ],
            },
            {
              tag: "menuitem",
              attributes: { label: getString("menu-archive-today") },
              listeners: [
                {
                  type: "command",
                  listener: () => archiveSelected("archivetoday"),
                },
              ],
            },
            {
              tag: "menuitem",
              attributes: { label: getString("menu-permacc") },
              listeners: [
                { type: "command", listener: () => archiveSelected("permacc") },
              ],
            },
            { tag: "menuseparator" },
            {
              tag: "menuitem",
              attributes: { label: getString("menu-robust-link") },
              listeners: [
                { type: "command", listener: () => createRobustLinks() },
              ],
            },
            { tag: "menuseparator" },
            {
              tag: "menuitem",
              attributes: { label: getString("menu-preferences") },
              listeners: [
                { type: "command", listener: () => openPreferences() },
              ],
            },
          ],
        },
      ],
    },
    win.document.getElementById("zotero-itemmenu")!,
  );
}

function onMainWindowUnload(win: Window) {
  ztoolkit.unregisterAll();
}

async function onShutdown() {
  ServiceRegistry.getInstance().clear();
  ztoolkit.unregisterAll();
  addon.data.alive = false;
}

function onNotify(
  event: string,
  type: string,
  ids: number[],
  extraData: Record<string, unknown>,
) {
  if (type === "item" && event === "add") {
    handleNewItems(ids);
  }
}

async function handleNewItems(ids: number[]) {
  const prefs = PreferencesManager.getInstance();
  if (!prefs.getPref("autoArchive")) return;

  for (const id of ids) {
    const item = await Zotero.Items.getAsync(id);
    if (item?.getField("url")) {
      await ArchiveCoordinator.getInstance().autoArchive(item);
    }
  }
}
```

### 3.2 Preferences Migration

**addon/prefs.js:**

```javascript
pref("extensions.momento7.autoArchive", true);
pref("extensions.momento7.defaultService", "internetarchive");
pref("extensions.momento7.fallbackEnabled", true);
pref("extensions.momento7.iaTimeout", 120000);
pref("extensions.momento7.iaMaxRetries", 3);
pref("extensions.momento7.iaRetryDelay", 5000);
// Note: Credentials stored via CredentialManager, not prefs
```

**addon/content/preferences.xhtml:**

```xml
<?xml version="1.0"?>
<!DOCTYPE window SYSTEM "chrome://momento7/locale/preferences.dtd">
<window xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">
  <vbox id="momento7-preferences">
    <groupbox>
      <label><html:h2 data-l10n-id="pref-general-title"/></label>
      <checkbox id="auto-archive" preference="extensions.momento7.autoArchive"
                data-l10n-id="pref-auto-archive"/>
      <menulist id="default-service" preference="extensions.momento7.defaultService">
        <menupopup>
          <menuitem value="internetarchive" data-l10n-id="service-ia"/>
          <menuitem value="archivetoday" data-l10n-id="service-archive-today"/>
          <menuitem value="permacc" data-l10n-id="service-permacc"/>
        </menupopup>
      </menulist>
    </groupbox>
    <!-- API Keys section -->
    <groupbox id="api-keys">
      <label><html:h2 data-l10n-id="pref-api-keys-title"/></label>
      <hbox>
        <label data-l10n-id="pref-ia-access-key"/>
        <textbox id="ia-access-key" type="password"/>
      </hbox>
      <!-- ... more fields ... -->
    </groupbox>
  </vbox>
</window>
```

### 3.3 Localization (Fluent)

**addon/locale/en-US/addon.ftl:**

```ftl
# Menu items
menu-archive = Archive this Resource
menu-ia = Internet Archive
menu-archive-today = Archive.today
menu-permacc = Perma.cc (Academic)
menu-uk-web-archive = UK Web Archive
menu-arquivo-pt = Arquivo.pt (Portuguese)
menu-robust-link = Create Robust Link (All Archives)
menu-preferences = Moment-o7 Preferences...

# Preferences
pref-general-title = General Settings
pref-auto-archive = Automatically archive new items with URLs
pref-default-service = Default archive service
pref-fallback-enabled = Try fallback services if primary fails
pref-api-keys-title = API Keys
pref-ia-access-key = Internet Archive Access Key
pref-ia-secret-key = Internet Archive Secret Key
pref-permacc-api-key = Perma.cc API Key

# Service names
service-ia = Internet Archive
service-archive-today = Archive.today
service-permacc = Perma.cc
service-uk-web-archive = UK Web Archive
service-arquivo-pt = Arquivo.pt

# Messages
archive-success = Successfully archived { $count } item(s) to { $service }
archive-failed = Archive failed: { $error }
archive-partial = Archived { $success } of { $total } items
```

---

## Phase 4: Test Migration (2-3 days)

### 4.1 Test Framework Setup

The template uses Mocha + Chai. Our tests use Jest. **Options:**

**Option A: Keep Jest (Recommended)**

- Add Jest to devDependencies
- Keep existing test structure
- Less migration work

**Option B: Convert to Mocha**

- More template alignment
- Requires test rewrites

### 4.2 Test File Mapping

```
tests/                          → test/
├── services/                   → test/modules/archive/
│   ├── BaseArchiveService.test.ts
│   ├── InternetArchiveService.test.ts
│   ├── ArchiveTodayService.test.ts
│   ├── PermaCCService.test.ts
│   ├── UKWebArchiveService.test.ts
│   ├── ArquivoPtService.test.ts
│   └── ArchiveCoordinator.test.ts
├── memento/                    → test/modules/memento/
│   └── MementoChecker.test.ts
├── utils/                      → test/utils/
│   ├── Cache.test.ts
│   ├── CircuitBreaker.test.ts
│   └── HtmlUtils.test.ts
├── preferences/                → test/modules/preferences/
│   └── PreferencesManager.test.ts
└── monitoring/                 → test/modules/monitoring/
    ├── Logger.test.ts
    ├── Metrics.test.ts
    └── HealthChecker.test.ts
```

### 4.3 Mock Updates

Update mocks to use `zotero-types`:

```typescript
// test/__mocks__/zotero.ts
import type { Zotero as ZoteroTypes } from "zotero-types";

export const mockItem: Partial<ZoteroTypes.Item> = {
  id: 123,
  getField: jest.fn((field: string) => {
    if (field === "url") return "https://example.com";
    if (field === "title") return "Test Article";
    return "";
  }),
  setField: jest.fn(),
  saveTx: jest.fn().mockResolvedValue(undefined),
};
```

---

## Phase 5: Polish and Release (1-2 days)

### 5.1 CI/CD Setup

**.github/workflows/build.yml:**

```yaml
name: Build and Release

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint:check
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: xpi
          path: build/*.xpi

  release:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v1
        with:
          files: xpi/*.xpi
```

### 5.2 Documentation Updates

- Update README.md with new installation instructions
- Update CLAUDE.md with new architecture
- Create CHANGELOG.md for v1.0.0

### 5.3 Migration Checklist

- [ ] Fork template repository
- [ ] Configure package.json and build config
- [ ] Set up directory structure
- [ ] Migrate archive services
- [ ] Migrate memento module
- [ ] Migrate utils
- [ ] Migrate monitoring
- [ ] Implement hooks.ts
- [ ] Create preferences UI
- [ ] Add localization strings
- [ ] Migrate tests
- [ ] Update mocks
- [ ] Set up CI/CD
- [ ] Update documentation
- [ ] Test in Zotero 7
- [ ] Create release

---

## Risk Assessment

| Risk                           | Likelihood | Impact | Mitigation                            |
| ------------------------------ | ---------- | ------ | ------------------------------------- |
| Test migration breaks coverage | Medium     | High   | Keep Jest, migrate incrementally      |
| API changes in toolkit         | Low        | Medium | Pin versions, test early              |
| Preference migration data loss | Medium     | High   | Add migration code for existing users |
| Zotero 7 API changes           | Low        | High   | Use zotero-types for type safety      |

---

## Success Criteria

1. **Functional parity**: All 5 archive services work
2. **Test coverage**: 685 tests passing with 80%+ coverage
3. **Hot reload**: `npm run dev` provides live development
4. **Localization**: All strings externalized to .ftl files
5. **Build**: Clean esbuild with <5s compile time
6. **Type safety**: No `any` types in new code

---

## Rollback Plan

The migration creates a new repository. The original `zotero-moment-o7` remains intact. If migration fails:

1. Continue development on original repo
2. Cherry-pick working improvements back
3. Retry migration with lessons learned

---

## References & Documentation

### Official Resources

- [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template) - Base template repository
- [Zotero Plugin Scaffold](https://github.com/zotero-plugin-dev/zotero-plugin-scaffold) - Build orchestration tool
- [Zotero Plugin Toolkit](https://windingwind.github.io/zotero-plugin-toolkit/) - API abstraction layer
- [Zotero 7 for Developers](https://www.zotero.org/support/dev/zotero_7_for_developers) - Official migration guide

### Community Resources

- [Zotero Plugin Dev Community](https://zotero-plugin.dev/) - Technical reference
- [zotero-types](https://www.npmjs.com/package/zotero-types) - TypeScript definitions
- [Fluent Localization](https://projectfluent.org/) - Mozilla's localization system

### Key Zotero 7 API Changes

| Legacy (Zotero 6)            | Modern (Zotero 7)          |
| ---------------------------- | -------------------------- |
| XUL overlays                 | Bootstrap.js injection     |
| `install.rdf`                | `manifest.json`            |
| `.xul` files                 | `.xhtml` files             |
| `.dtd`/`.properties`         | Fluent `.ftl` files        |
| `OS.File`/`OS.Path`          | `IOUtils`/`PathUtils`      |
| XUL layout (`-moz-box-flex`) | Modern flexbox (`flex: 1`) |
| `<textbox>`                  | `<html:input type="text">` |

---

_Created: 2025-12-30_
_Last Updated: 2025-12-30_
