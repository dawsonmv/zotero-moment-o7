# Zotero Momento-W8

Archive web resources to prevent link rot — for **Zotero 8 and Zotero 9**.

Momento-W8 automatically archives web pages to the Internet Archive (and optionally other archives) when you save items via the Browser Connector, and lets you archive any selected item on demand from the right-click menu. It can also generate [Robust Links](https://robustlinks.mementoweb.org/) that combine the original URL with archived snapshots.

This is the successor to [zotero-moment-o7](https://github.com/dawsonmv/zotero-moment-o7) (Zotero 7), rebuilt as a fresh, lean codebase for Zotero's rapid-release cycle.

## Compatibility

| Zotero version | Supported |
|---|---|
| Zotero 9.x (current) | ✅ |
| Zotero 8.x | ✅ |
| Zotero 7.x and earlier | ❌ — use [zotero-moment-o7](https://github.com/dawsonmv/zotero-moment-o7) |

## Features

- **Auto-archive** — new items saved through the Browser Connector are archived to your default service automatically
- **Five archive services** — Internet Archive, Archive.today (via Cloudflare Worker proxy), Perma.cc (API key required), UK Web Archive, Arquivo.pt
- **Robust Links** — one click archives to multiple services and attaches a note with copy-paste HTML snippets (`data-originalurl` / `data-versionurl` / `data-versiondate`)
- **Memento pre-checks** — RFC 7089 Memento Protocol lookups avoid re-archiving pages that already have a recent snapshot
- **Fallback ordering** — if a service fails, the next one in your configured order is tried
- **Preferences pane** — enable/disable services, tune timeouts, and set the Perma.cc API key under Zotero Settings

## Installation

1. Download `zotero-momento-w8.xpi` from the [latest release](https://github.com/dawsonmv/zotero-momento-w8/releases)
2. In Zotero: **Tools → Plugins → ⚙ → Install Plugin From File…**
3. Select the XPI and restart Zotero

## Usage

- **Automatic**: save an item with the Browser Connector — it archives in the background and the archived URL is stored in the item's Extra field
- **Manual**: right-click one or more items → choose an "Archive to …" entry
- **Robust Link**: right-click → **Create Robust Link** to archive to all configured services and attach a formatted note

## Building from source

```bash
bash scripts/build.sh
```

This produces `zotero-momento-w8.xpi` in the project root. No compile step is required — the plugin is plain JavaScript loaded by Zotero's script loader.

## Architecture

```
bootstrap.js              Plugin lifecycle (startup/shutdown/window hooks)
prefs.js                  Default preferences (registered by Zotero)
content/preferences.xhtml Preferences pane (registered via Zotero.PreferencePanes)
src/momento-w8.js         Main entry — namespace, menus, notifier, service registration
src/ServiceRegistry.js    Dynamic registry of archive services
src/BaseArchiveService.js Shared service behavior (rate limits, notes, Extra field)
src/ArchiveCoordinator.js Archiving workflow + fallback ordering + Memento pre-checks
src/MementoChecker.js     RFC 7089 Memento Protocol lookups
src/*Service.js           One class per archive service
src/RobustLinkCreator.js  Multi-service Robust Link notes
cloudflare-worker/        Archive.today CORS proxy (deploy with wrangler)
```

All preferences live under `extensions.zotero.momentow8.*` and are read/written with the explicit `global` flag (`Zotero.Prefs.get(key, true)`).

## Zotero 8/9 notes

- No JSM imports, Bluebird promise methods, `Zotero.spawn()`, or `nsIScriptableUnicodeConverter` usage — the codebase is clean against the [Zotero 8 migration list](https://www.zotero.org/support/dev/zotero_8_for_developers)
- The preferences pane script runs in Zotero 8's isolated pane scope; handlers are attached to the shared `Zotero.MomentoW8` namespace
- XUL `<grid>` (removed from Firefox) is not used; layout uses `hbox`/`vbox`

## License

See [LICENSE](LICENSE).
