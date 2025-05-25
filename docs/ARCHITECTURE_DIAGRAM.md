# Zotero Moment-o7 Architecture Diagram

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Zotero Desktop App                        │
├─────────────────────────────────────────────────────────────────┤
│                      Zotero Moment-o7 Plugin                     │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │   UI/Menu   │  │    Core      │  │   Data Management   │   │
│  │  - Menus    │  │  - Init      │  │  - Extra field      │   │
│  │  - Dialogs  │  │  - Events    │  │  - Notes            │   │
│  │  - Progress │  │  - Routing   │  │  - Attachments      │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Service Modules                        │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌────────────────┐  ┌──────────────┐ │   │
│  │  │  IaPusher   │  │ArchiveTodayPusher│ │MementoChecker│ │   │
│  │  │   (Direct)  │  │   (Via Proxy)    │ │  (Direct)    │ │   │
│  │  └─────┬───────┘  └────────┬─────────┘ └──────┬───────┘ │   │
│  │        │                    │                   │         │   │
│  └────────┼────────────────────┼───────────────────┼─────────┘   │
└───────────┼────────────────────┼───────────────────┼─────────────┘
            │                    │                   │
            │ HTTPS              │ HTTPS            │ HTTPS
            │ (CORS OK)          │ (Via Worker)     │ (CORS OK)
            │                    │                   │
            ▼                    ▼                   ▼
┌─────────────────┐    ┌──────────────────┐   ┌─────────────────┐
│ Internet Archive│    │ Cloudflare Worker│   │ TimeTravel.org  │
│ web.archive.org │    │  (CORS Proxy)    │   │ Memento Aggregator│
└─────────────────┘    └────────┬─────────┘   └─────────────────┘
                                │
                                │ HTTPS
                                │ (No CORS)
                                ▼
                       ┌─────────────────┐
                       │  Archive.today  │
                       │ (Blocks CORS)   │
                       └─────────────────┘
```

## Proposed Architecture for New Services

```
┌─────────────────────────────────────────────────────────────────┐
│                      Zotero Moment-o7 Plugin                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Service Router/Manager                    │   │
│  │  Determines best path for each service (direct/proxy)    │   │
│  └─────────────┬──────────────────────┬─────────────────────┘   │
│                │                      │                          │
│   ┌────────────▼─────────┐  ┌────────▼────────────┐           │
│   │   Direct Services    │  │  Proxied Services   │           │
│   │                      │  │                      │           │
│   │ • Internet Archive   │  │ • Archive.today     │           │
│   │ • Memento Protocol   │  │ • [Others if CORS   │           │
│   │ • Perma.cc (TBD)     │  │   blocked]          │           │
│   │ • UK Web Archive     │  │                      │           │
│   └──────────┬───────────┘  └──────────┬──────────┘           │
└──────────────┼──────────────────────────┼──────────────────────┘
               │                          │
               │ Direct HTTPS             │ HTTPS to Worker
               │ (CORS Allowed)           │
               │                          ▼
               │              ┌───────────────────────┐
               │              │  Cloudflare Worker   │
               │              │                      │
               │              │  /v1/archive-today   │
               │              │  /v1/permacc  (?)    │
               │              │  /v1/conifer  (?)    │
               │              │  /v1/health          │
               │              └───────────┬──────────┘
               │                          │
               ▼                          ▼
        ┌──────────────┐          ┌──────────────┐
        │ Direct APIs  │          │ Blocked APIs │
        └──────────────┘          └──────────────┘
```

## Data Flow Examples

### Direct Service (Internet Archive)
```
User Action → Plugin → Internet Archive API → Plugin → Update Zotero
    │            │             │                 │           │
    │            ├─ Request ───┘                 │           │
    │            │                               │           │
    │            └─ Response ←──────────────────┘           │
    │                                                        │
    └─ See result ←─────────────────────────────────────────┘
```

### Proxied Service (Archive.today)
```
User Action → Plugin → CF Worker → Archive.today → CF Worker → Plugin → Update
    │            │          │            │              │          │        │
    │            ├─ Request ┘            │              │          │        │
    │            │                       │              │          │        │
    │            │                       └─ Submit ────┘          │        │
    │            │                                                 │        │
    │            └─ Get result ←───────────────────────────────────┘        │
    │                                                                       │
    └─ See result ←────────────────────────────────────────────────────────┘
```

### Memento Check Flow
```
User Action → Plugin → TimeTravel API → Plugin → Decision
    │            │            │             │         │
    │            ├─ Query ───┘             │         │
    │            │                         │         ├─ Already archived
    │            └─ TimeMap ←──────────────┘         │  └─ Skip
    │                                                │
    │                                                └─ Not archived
    │                                                   └─ Proceed to archive
    └─ See result
```

## Service Classification

### 🟢 Always Direct (Plugin Only)
- Internet Archive - Explicitly allows CORS
- Memento Protocol - Read-only, public data
- UK Web Archive - Memento-compliant
- Most TimeGates - Standard HTTP

### 🟡 Test Required
- Perma.cc - Need to verify CORS headers
- Conifer - Complex API, likely needs proxy
- Regional archives - Varies by implementation

### 🔴 Always Proxied (Need Worker)
- Archive.today - Actively blocks CORS
- Any service requiring:
  - Browser-like sessions
  - Complex form submissions
  - IP-based access
  - Request signing

## Decision Flow for New Services

```
                    New Service
                        │
                        ▼
                 Test CORS Support
                    /        \
                   /          \
                YES            NO
                 │              │
                 ▼              ▼
         Implement in      Need Proxy?
           Plugin            /    \
                           /      \
                       Simple    Complex
                         │         │
                         ▼         ▼
                   Basic Proxy  Full Worker
                                Service
```

## Security Boundaries

```
┌─────────────────────────────────────────┐
│            Zotero Plugin                 │
│  • Stores API keys                       │
│  • Manages user preferences              │
│  • Never sends secrets to worker         │
├─────────────────────────────────────────┤
│         ↕ HTTPS + Auth ↕                │
├─────────────────────────────────────────┤
│         Cloudflare Worker               │
│  • No persistent storage                │
│  • No access to user data               │
│  • Only proxies allowed requests        │
├─────────────────────────────────────────┤
│         ↕ HTTPS ↕                       │
├─────────────────────────────────────────┤
│        External Services                │
└─────────────────────────────────────────┘
```

## Performance Optimization Points

1. **Parallel Execution**: Plugin can call multiple services simultaneously
2. **Caching Layer**: Both plugin (localStorage) and Worker (Cache API)
3. **Early Termination**: Check Memento before creating new archives
4. **Batch Operations**: Group similar requests when possible
5. **Circuit Breaker**: Disable failing services temporarily