# Updated Implementation Plan (December 2024)

## Executive Summary

This plan supersedes the previous plans (ARCHIVING_SERVICES_PLAN.md, IMPLEMENTATION_PLAN_2024.md, ARCHITECTURE_REFACTORING_PLAN.md) based on an evaluation of the current codebase state.

**Key Finding**: The architecture refactoring is ~70% complete but the services aren't wired up, and the documented plans are outdated.

---

## Current State Evaluation

### ✅ COMPLETED (from previous plans)

| Component | Status | Notes |
|-----------|--------|-------|
| ServiceRegistry.ts | ✅ Done | Singleton pattern, dynamic registration |
| BaseArchiveService.ts | ✅ Done | Abstract class with common functionality |
| ArchiveCoordinator.ts | ✅ Done | Fallback logic, auto-archive support |
| InternetArchiveService.ts | ✅ Done | Fully ported to TypeScript |
| ArchiveTodayService.ts | ✅ Done | TypeScript implementation exists |
| PermaCCService.ts | ✅ Done | TypeScript implementation exists |
| UKWebArchiveService.ts | ✅ Done | TypeScript implementation exists |
| ArquivoPtService.ts | ✅ Done | TypeScript implementation exists |
| MementoChecker.ts | ✅ Done | Multi-aggregator support implemented |
| MementoProtocol.ts | ✅ Done | RFC 7089 compliant |
| PreferencesManager.ts | ✅ Done | Type-safe preference management |
| Utility classes | ✅ Done | HttpClient, Cache, CircuitBreaker, HtmlUtils |
| MomentO7.ts | ✅ Done | Main plugin class with menu integration |

### ⚠️ PARTIALLY COMPLETE

| Component | Issue |
|-----------|-------|
| Service Registration | Only InternetArchiveService is registered in MomentO7.ts:54-60 |
| Memento Pre-checks | MementoChecker exists but NOT integrated into ArchiveCoordinator |
| Test Coverage | Only 4 utility tests exist (~15% coverage) |
| Code Cleanup | Duplicate files and legacy JS still present |

### ❌ NOT STARTED

| Component | Description |
|-----------|-------------|
| Perma.cc API Key UI | Settings dialog for API key management |
| Quota Tracking | User notification before hitting service limits |
| Archive Quality Assessment | From ARCHITECTURE_REFACTORING_PLAN (lines 423-476) |
| Plugin Icons | icon48.png and icon96.png are placeholders |

---

## Critical Issues

### 1. Services Not Registered (HIGH PRIORITY)

**Location**: `src/MomentO7.ts:54-60`

```typescript
// Current state - only one service registered:
registry.register('internetarchive', new InternetArchiveService());

// TODO: Register other services when ported to TypeScript
// registry.register('archivetoday', new ArchiveTodayService());
// registry.register('permacc', new PermaCCService());
// registry.register('ukwebarchive', new UKWebArchiveService());
// registry.register('arquivopt', new ArquivoPtService());
```

**Impact**: Users can only use Internet Archive despite 5 services being implemented in TypeScript.

### 2. Memento Not Integrated (MEDIUM PRIORITY)

**Location**: `src/services/ArchiveCoordinator.ts`

MementoChecker.ts exists with full implementation but ArchiveCoordinator doesn't use it for pre-archive checks. The ARCHITECTURE_REFACTORING_PLAN.md (lines 149-178) describes this integration but it wasn't implemented.

### 3. Duplicate/Legacy Files (LOW PRIORITY)

| TypeScript Version | Legacy JS Version (to remove) |
|--------------------|-------------------------------|
| src/services/ServiceRegistry.ts | src/ServiceRegistry.js |
| src/services/BaseArchiveService.ts | src/BaseArchiveService.js |
| src/services/InternetArchiveService.ts | src/InternetArchiveService.js |
| src/services/ArchiveTodayService.ts | src/ArchiveTodayService.js |
| src/services/ArchiveCoordinator.ts | src/ArchiveCoordinator.js |
| src/memento/MementoChecker.ts | src/MementoChecker.js |
| src/memento/MementoProtocol.ts | src/MementoProtocol.js |
| src/services/BaseArchiveService.ts | src/services/BaseArchiveService2.ts |

**Also legacy (pusher pattern)**: IaPusher.js, ArchiveTodayPusher.js, PermaCCPusher.js

---

## Updated Implementation Plan

### Phase 1: Wire Up Existing Services (1-2 days)

**Goal**: Enable all 5 archive services that are already implemented in TypeScript.

#### Tasks:
1. Import and register all TypeScript services in MomentO7.ts
2. Verify each service works with the existing ArchiveCoordinator
3. Test menu items trigger correct services
4. Update preferences defaults if needed

#### Files to modify:
- `src/MomentO7.ts` - Add imports and registrations

### Phase 2: Integrate Memento Pre-checks (1-2 days)

**Goal**: Check existing archives before creating duplicates.

#### Tasks:
1. Add MementoChecker integration to ArchiveCoordinator
2. Add preference for "check before archive" (already defined)
3. Add preference for "archive age threshold"
4. Show user when recent archive exists
5. Allow user to proceed or skip

#### Files to modify:
- `src/services/ArchiveCoordinator.ts` - Add pre-check logic
- `src/preferences/PreferencesManager.ts` - Add new preferences

### Phase 3: Test Coverage (2-3 days)

**Goal**: Increase test coverage to 50%+

#### Priority test files to create:
1. `tests/services/InternetArchiveService.test.ts`
2. `tests/services/ArchiveCoordinator.test.ts`
3. `tests/services/ServiceRegistry.test.ts`
4. `tests/memento/MementoChecker.test.ts`
5. `tests/preferences/PreferencesManager.test.ts`

### Phase 4: Code Cleanup (1 day)

**Goal**: Remove legacy code and duplicates.

#### Tasks:
1. Delete legacy JS files that have TypeScript replacements
2. Remove BaseArchiveService2.ts (merge or delete)
3. Update imports throughout codebase
4. Verify build still works

### Phase 5: Perma.cc API Key Management (1-2 days)

**Goal**: Allow users to configure Perma.cc API key through UI.

#### Tasks:
1. Add API key input to preferences dialog
2. Secure storage of API key
3. Validate API key on save
4. Show quota remaining (10/month free)

### Phase 6: Polish & Documentation (1 day)

**Goal**: Finalize for release.

#### Tasks:
1. Create actual plugin icons (48x48, 96x96)
2. Update README with new features
3. Update CHANGELOG
4. Archive old plan documents or mark as superseded

---

## Linear Execution Order

```
1.  Register ArchiveTodayService in MomentO7.ts
2.  Register PermaCCService in MomentO7.ts
3.  Register UKWebArchiveService in MomentO7.ts
4.  Register ArquivoPtService in MomentO7.ts
5.  Test all 5 services work via menu
6.  Add Memento pre-check to ArchiveCoordinator
7.  Add "check before archive" preference
8.  Add "archive age threshold" preference
9.  Test Memento integration
10. Write ServiceRegistry.test.ts
11. Write ArchiveCoordinator.test.ts
12. Write InternetArchiveService.test.ts
13. Write MementoChecker.test.ts
14. Write PreferencesManager.test.ts
15. Delete legacy JS files (IaPusher.js, etc.)
16. Delete BaseArchiveService2.ts
17. Delete duplicate service JS files
18. Add Perma.cc API key to preferences UI
19. Add API key validation
20. Create plugin icons
21. Update README.md
22. Update CHANGELOG.md
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Registered Services | 5 (currently 1) |
| Test Coverage | 50% (currently ~15%) |
| Legacy JS Files | 0 (currently 18) |
| Working Memento Pre-check | Yes (currently No) |
| Perma.cc API Key UI | Yes (currently No) |

---

## Files Referenced

- `src/MomentO7.ts` - Main plugin, service registration
- `src/services/ArchiveCoordinator.ts` - Archiving workflow
- `src/services/ServiceRegistry.ts` - Service management
- `src/memento/MementoChecker.ts` - Memento protocol
- `src/preferences/PreferencesManager.ts` - User preferences
- `tests/` - Test files

---

## Superseded Documents

The following documents are now outdated:
- `ARCHIVING_SERVICES_PLAN.md` - Services are implemented, just not wired
- `IMPLEMENTATION_PLAN_2024.md` - Timeline is obsolete
- `docs/ARCHITECTURE_REFACTORING_PLAN.md` - Architecture is mostly done
