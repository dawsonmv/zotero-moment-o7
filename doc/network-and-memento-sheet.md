# Network & Memento Command Sheet

Operational cheat sheet for Moment-o7’s network-facing code: how to call archives, handle timeouts/retries, and work with the Memento protocol.

## HTTP Command Patterns
- Prefer `Zotero.HTTP.request` for all network calls (respects Zotero proxy/cookies). Signature: `Zotero.HTTP.request(method, url, { headers, body, timeout, responseType })` or two-arg overload `Zotero.HTTP.request(url, opts)`.
- Default UA: set in `src/utils/HttpClient.ts` (“Mozilla/5.0 (compatible; Zotero)”). Override per service if needed.
- Timeouts: use `PreferencesManager.getTimeout()` as the baseline; Internet Archive and Archive.today add retry/backoff logic.
- Retries/backoff: see `InternetArchiveService` (max retries + increasing timeout on 408/timeout) and `ArchiveTodayService` (retries via proxy vs direct).
- Error typing: `ArchiveErrorType` maps HTTP/network failures to user-friendly messages; keep mappings in `BaseArchiveService.mapHttpError`.

## Archive Service Endpoints (as implemented)
- **Internet Archive (SPN2 auth)**:  
  - Submit: `POST https://web.archive.org/save` with `Authorization: LOW <access>:<secret>`, body `url=<target>`, `Accept: application/json`.  
  - Poll job: `GET https://web.archive.org/save/status/<jobId>` with same auth; success returns timestamp/original URL → build `https://web.archive.org/web/<timestamp>/<original>`.
- **Internet Archive (public)**:  
  - Submit: `GET https://web.archive.org/save/<target>`; archive URL taken from `Link: <...>; rel="memento"` or HTML body.
- **Archive.today**:  
  - Direct submit: `POST https://archive.today/submit/` form body `url=<target>`; scrape archived URL from response (`archive.*` snapshot link or `SHARE_LONGLINK`).  
  - Proxy submit (optional): user-configured proxy URL via prefs, `POST proxyUrl { url, headers? }` expecting JSON `{ archivedUrl }`. Test with `ArchiveTodayService.testCredentials`.
- **Perma.cc** (auth required):  
  - Create archive: `POST https://api.perma.cc/v1/archives/` JSON `{ url, folder? }` with `Authorization: ApiKey <apiKey>`. Returns `{ guid }` → archived URL `https://perma.cc/<guid>`.  
  - Check quota/user: `GET https://api.perma.cc/v1/user/` with same auth.
- **Arquivo.pt**:  
  - Submit: `POST https://arquivo.pt/save` form body `url=<target>`.  
  - Existing check: GET Timemap via `https://arquivo.pt/wayback/timemap/json/<url>` (handled in `findExistingArchive`); archived URLs match `https://arquivo.pt/wayback/<timestamp>/<original>`.
- **UK Web Archive** (nomination flow):  
  - Nominate: `POST https://www.webarchive.org.uk/en/ukwa/nominate` form body built by `UKWebArchiveService.buildNominationForm(url)`; response parsed for success strings.  
  - Existing check: GET `https://www.webarchive.org.uk/wayback/timemap/json/<url>` to detect prior captures.

## Memento Protocol (RFC 7089)
- Helpers live in `src/modules/memento/`: `MementoProtocol` (parse/format Link headers, Timemap JSON/link-format) and `MementoChecker` (aggregator + archive lookups).
- Aggregator endpoints used:  
  - Time Travel: `http://timetravel.mementoweb.org/timemap/json/<url>` and `.../timegate/<url>`  
  - MemGator: `https://memgator.cs.odu.edu/timemap/json/<url>` and `.../timegate/<url>`
- Archive-specific Timemap endpoints checked:  
  - Internet Archive `https://web.archive.org/web/timemap/json/<url>`  
  - UK Web Archive `https://www.webarchive.org.uk/wayback/timemap/json/<url>`  
  - Arquivo.pt `https://arquivo.pt/wayback/timemap/json/<url>`  
  - Archive.today currently lacks Memento support (skipped in checker).
- Flow: `MementoChecker.checkUrl(url)` → try aggregators first → fall back to archive Timemaps → pick best memento via `MementoProtocol.findBestMemento`. `findExistingMementos` also scans item Extra/note robust links before hitting network.

## Sample Usage Snippets
```ts
// Generic GET with Zotero.HTTP
const res = await Zotero.HTTP.request("GET", timemapUrl, {
  headers: { Accept: "application/json, application/link-format" },
  timeout: 30000,
});
const timemap = MementoProtocol.parseTimeMap(JSON.parse(res.responseText));

// Using HttpClient helper
import { HttpClient } from "../utils/HttpClient";
const http = new HttpClient(60000);
const { data, status } = await http.post(
  "https://api.perma.cc/v1/archives/",
  JSON.stringify({ url }),
  { headers: { Authorization: `ApiKey ${apiKey}`, "Content-Type": "application/json" } },
);

// Circuit breaker-friendly retry
await Zotero.Promise.delay(retryDelayMs); // between retries; see InternetArchiveService
```

## Concrete Flows
```ts
// Internet Archive SPN2: submit + poll
const creds = await PreferencesManager.getIACredentials();
const submit = await Zotero.HTTP.request("POST", "https://web.archive.org/save", {
  headers: {
    Accept: "application/json",
    Authorization: `LOW ${creds.accessKey}:${creds.secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: `url=${encodeURIComponent(url)}`,
  timeout: 60000,
});
const job = JSON.parse(submit.responseText || "{}");
if (job.job_id) {
  const status = await Zotero.HTTP.request(
    "GET",
    `https://web.archive.org/save/status/${job.job_id}`,
    { headers: { Authorization: `LOW ${creds.accessKey}:${creds.secretKey}` } },
  );
  const result = JSON.parse(status.responseText || "{}");
  const archivedUrl = `https://web.archive.org/web/${result.timestamp}/${result.original_url}`;
}
```

```ts
// Archive.today direct vs proxy submit
const useProxy = !!proxyUrlFromPrefs;
const submitUrl = useProxy ? proxyUrlFromPrefs : "https://archive.today/submit/";
const submitBody = useProxy
  ? JSON.stringify({ url, headers: { "User-Agent": "Mozilla/5.0 (compatible; Zotero)" } })
  : `url=${encodeURIComponent(url)}`;
const submitHeaders = useProxy
  ? { "Content-Type": "application/json" }
  : { "Content-Type": "application/x-www-form-urlencoded" };
const response = await Zotero.HTTP.request("POST", submitUrl, {
  headers: submitHeaders,
  body: submitBody,
  timeout: 60000,
});
const htmlOrJson = response.responseText;
const archivedUrl = useProxy
  ? JSON.parse(htmlOrJson).archivedUrl
  : ArchiveTodayService.prototype.extractArchivedUrl(htmlOrJson);
```

```ts
// Perma.cc create archive with folder support
const apiKey = await PreferencesManager.getPermaCCApiKey();
const body = { url: targetUrl };
const defaultFolder = Zotero.Prefs.get("extensions.momento7.permaccFolder") as string;
if (defaultFolder) body.folder = defaultFolder;
const { data, status } = await http.post(
  "https://api.perma.cc/v1/archives/",
  JSON.stringify(body),
  {
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: PreferencesManager.getTimeout(),
  },
);
if (status >= 400) throw new Error(PermaCCService.prototype.parsePermaCCError({ data }));
const { guid } = JSON.parse(data);
const archivedUrl = `https://perma.cc/${guid}`;
```

```ts
// Arquivo.pt: check existing, then submit if needed
const timemapUrl = `https://arquivo.pt/wayback/timemap/json/${encodeURIComponent(url)}`;
const tmRes = await Zotero.HTTP.request("GET", timemapUrl, {
  headers: { Accept: "application/json" },
  timeout: 20000,
});
const existing = MementoProtocol.parseTimeMap(JSON.parse(tmRes.responseText));
const best = MementoProtocol.findBestMemento(existing.mementos);
const alreadyArchived = best?.url;
if (!alreadyArchived) {
  await Zotero.HTTP.request("POST", "https://arquivo.pt/save", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `url=${encodeURIComponent(url)}`,
    timeout: 60000,
  });
}
```

```ts
// Memento: aggregator-first lookup and local cache check
const localMementos = MementoChecker.findExistingMementos(item);
if (localMementos.length) return localMementos;
const result = await MementoChecker.checkUrl(url);
if (result.hasMemento) {
  const best = MementoProtocol.findBestMemento(
    result.mementos.map((m) => ({ url: m.url, datetime: m.datetime })),
  );
  Zotero.debug(`Best memento: ${best?.url}`);
}
```
