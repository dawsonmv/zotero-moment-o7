# Zotero 7 Plugin API Quick Sheet

Purpose-built crib notes for building/debugging the Moment-o7 add-on with the Zotero 7 API and this repo’s scaffolding.

## Runtime Basics

- Globals: `Zotero` (core API), `ZoteroPane` (pane helpers), `ZoteroPane_Local` (selection helpers), `Zotero_Tabs`, `window`/`document` from the chrome window.
- Async: prefer `async/await`; some legacy APIs return `Zotero.Promise` but await works. Use `Zotero.defer`/`Zotero.Promise.delay` or `Zotero.setTimeout` for timers.
- Windows: `Zotero.getMainWindow()` to access menus/UI; `Zotero.getActiveZoteroPane()` for the current pane.
- Logging/UI: `Zotero.debug(msg)`, `Zotero.alert(window, title, msg)`, `new Zotero.ProgressWindow(name)` for progress UIs with `progressItem` updates.

## Lifecycle Hooks (see src/hooks.ts)

- `onStartup`/`onShutdown`: register/unregister observers, commands, menus; avoid long blocking work.
- `onMainWindowLoad`/`onMainWindowUnload`: manipulate DOM menus/toolbar, set up hotkeys per window.
- `onItemSelected`: respond to selection changes if needed; keep cheap or debounce.

```ts
// hooks.ts-style wiring
export async function onStartup() {
  Zotero.debug("Moment-o7 starting");
  Zotero.Notifier.registerObserver(itemObserver, ["item"], "momento7");
}

export async function onShutdown() {
  Zotero.Notifier.unregisterObserver(itemObserver, "momento7");
}

const itemObserver = {
  notify(event, type, ids) {
    if (event === "add" && type === "item") {
      // kick off auto-archive
      ArchiveCoordinator.instance.autoArchive(ids);
    }
  },
};
```

## Data Model & Transactions

- Fetch: `Zotero.Items.get(id)`, `Zotero.Items.getAsync(ids)`, `Zotero.Collections.get(id)`, `Zotero.Search()`.
- Item edits: `await item.setField("url", "https://...")`; persist with `await item.saveTx()` for transactional save (batch multiple edits inside a single transaction).
- Creators/attachments/tags: `item.getCreatorsJSON()`, `item.setCreators(creators)`, `item.getAttachments()`, `item.addTag("archived")`, `item.removeTag("archived")`.
- Notes: `item.getNotes()` returns note IDs; `Zotero.Items.get(noteId).getNote()` to read HTML; update with `setNote(html)` + `saveTx()`.

```ts
// Batch edit inside a single transaction
const items = Zotero.getActiveZoteroPane().getSelectedItems();
await Zotero.DB.executeTransaction(async () => {
  for (const item of items) {
    item.setField("archiveLocation", "web.archive.org");
    item.addTag("archived");
    await item.save(); // save inside the transaction
  }
});
```

## Selection Helpers

- Selected items: `const items = Zotero.getActiveZoteroPane().getSelectedItems();`
- Current library/collection: `ZoteroPane.getSelectedCollection()` or `getSelectedLibraryID()`.

```ts
// Skip notes/attachments; operate on top-level items only
const pane = Zotero.getActiveZoteroPane();
const items = pane.getSelectedItems().filter((i) => i.isRegularItem());
if (!items.length) {
  Zotero.alert(pane.window, "Moment-o7", "No items selected");
}
```

## Preferences & Storage

- Branch your prefs: `const branch = "extensions.momento7."`; `Zotero.Prefs.get(branch + "autoArchive")`; `Zotero.Prefs.set(branch + "iaTimeout", 60000)`.
- Secure secrets: keep API keys via `Zotero.Utilities.Internal.zoteroFile.putContentsAsync` or the provided `PreferencesManager` (see `src/modules/preferences/PreferencesManager.ts`).
- Files: `await Zotero.File.putContentsAsync(path, data)` / `await Zotero.File.getContentsAsync(path)` for local storage.

```ts
// Read/write prefs with defaults
const branch = "extensions.momento7.";
const timeout = (Zotero.Prefs.get(branch + "iaTimeout") as number) || 60000;
Zotero.Prefs.set(branch + "autoArchive", true);

// Securely store API keys via PreferencesManager
await PreferencesManager.saveIACredentials({
  accessKey: "abc",
  secretKey: "xyz",
});
const creds = await PreferencesManager.getIACredentials();
```

## Networking

- Primary API: `await Zotero.HTTP.request(methodOrUrl, urlOrOpts?, opts?)`.
  - Typical usage: `Zotero.HTTP.request("POST", "https://service", { headers, body, timeout: 60000, responseType: "json" });`
  - Handles Zotero’s cookie jar/proxy settings; honors `timeout`; returns `{ status, statusText, responseText, responseJSON, getAllResponseHeaders(), getResponseHeader() }`.
- Convenience wrapper: `src/utils/HttpClient.ts` adds typed responses, default UA, and error normalization (`get/post` helpers).
- Respect rate limits: use `await Zotero.Promise.delay(ms)` or `Zotero.setTimeout` between retries; circuit breaker patterns live in `src/utils/CircuitBreaker.ts`.

```ts
// Raw Zotero.HTTP
const res = await Zotero.HTTP.request("GET", "https://example.com", {
  headers: { Accept: "application/json" },
  timeout: 15000,
});
const data = JSON.parse(res.responseText || "{}");

// HttpClient wrapper
import { HttpClient } from "./utils/HttpClient";
const http = new HttpClient(60000);
const { data: body, status } = await http.post(
  "https://api.perma.cc/v1/archives/",
  JSON.stringify({ url: "https://foo.bar" }),
  {
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      "Content-Type": "application/json",
    },
  },
);
if (status >= 400) throw new Error("Perma.cc failed");
```

## Eventing & Observers

- Notifier: `Zotero.Notifier.registerObserver(observer, ["item"], "momento7")` with `{ notify(event, type, ids, extraData) { ... } }`. Call `Zotero.Notifier.unregisterObserver(observer, "momento7")` on shutdown.
- Item tree columns: `Zotero.ItemTreeManager.registerColumn({ id, label, dataKey, handler })`; refresh via `ZoteroPane.itemsView.refresh();`.
- Menus/commands: add `menuitem` nodes to `document` on window load; attach command IDs that map to functions registered in `Zotero` command table.

```ts
// Register a custom column
Zotero.ItemTreeManager.registerColumn({
  id: "momento7-archived",
  label: "Archived?",
  dataKey: "momento7Archived",
  flex: 1,
  handler: {
    getCellText(item) {
      return item.hasTag("archived") ? "Yes" : "";
    },
  },
});

// Add a context menu item on window load
function addMenu(window) {
  const doc = window.document;
  const menu = doc.getElementById("zotero-itemmenu");
  const item = doc.createXULElement("menuitem");
  item.setAttribute("id", "momento7-archive-menu");
  item.setAttribute("label", Zotero.getString("momento7-archive-selected"));
  item.addEventListener("command", () =>
    ArchiveCoordinator.instance.archiveSelected(),
  );
  menu.appendChild(item);
}
```

## UI & Localization

- Fluent strings live in `addon/locale/en-US/addon.ftl`; IDs are typed in `typings/i10n.d.ts`.
- Preferences pane markup at `addon/content/preferences.xhtml` with logic in `src/modules/preferences/PreferencesManager.ts`.
- Use `Zotero.getString("momento7.key")` for localized labels.

```ts
// Example localized alert
const win = Zotero.getMainWindow();
Zotero.alert(
  win,
  Zotero.getString("momento7-preferences"),
  Zotero.getString("archive-complete"),
);

// Populate a Fluent string with variables
const msg = Zotero.getString("momento7-archive-all", ["3 items"]);
```

## Testing & Build

- Tests: `npm test` (Jest); add cases under `tests/`. Prefer pure logic in `src/modules` for testability; mock Zotero globals as needed.
- Lint/format: `npm run lint:check`; typecheck via `tsc --noEmit` using `zotero-types` (see `tsconfig.json`).
- Build/watch: `npm start` for dev profile hot reload; `npm run build` for distributable `.xpi` in `.scaffold/build/`.
