# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zotero Momento-W8 is a Zotero 8/9 plugin that archives web resources to Internet Archive, Archive.today, Perma.cc, UK Web Archive, and Arquivo.pt to prevent link rot. It is the successor to zotero-moment-o7 (Zotero 7), ported to a clean single-runtime codebase.

## Architecture

Bootstrap plugin (no compile step). `bootstrap.js` loads `src/momento-w8.js` via `Services.scriptloader.loadSubScript`, which in turn loads every module in `src/` and registers the five services in `Zotero.MomentoW8.ServiceRegistry`.

- Namespace: `Zotero.MomentoW8`
- Plugin ID: `zotero-momento-w8@github.com`
- Preferences branch: `extensions.zotero.momentow8.*`
- Defaults: `prefs.js` at plugin root (Zotero registers these automatically); `src/Preferences.js` re-applies them defensively
- Preferences pane: `content/preferences.xhtml`, registered in `bootstrap.js` via `Zotero.PreferencePanes.register`

## Critical API rules

- `Zotero.Prefs.get(pref, global)` — the second parameter is a **global-path flag, not a default value**. All keys in this codebase are fully qualified, so every `get`/`set`/`clear` call MUST pass `true` as the final argument. Never pass a default value as the second argument.
- Preference pane scripts run in an isolated scope in Zotero 8+; anything referenced from `oncommand` attributes must be reachable via a shared object (we use `Zotero.MomentoW8.PreferencesPane`).
- Do not use: JSM imports (`Cu.import`), Bluebird promise methods, `Zotero.spawn()`, XUL `<grid>`, `Components.classes` XPCOM lookups (use `Services.*`).

## Build & test

- Build: `bash scripts/build.sh` → `zotero-momento-w8.xpi`
- Syntax check: `find src -name "*.js" -exec node --check {} \;`
- Manual test: install XPI in Zotero 8/9, watch Tools → Developer → Error Console

## Compatibility targets

`strict_min_version: 8.0`, `strict_max_version: 9.*` (manifest.json and update.json must stay in sync).
