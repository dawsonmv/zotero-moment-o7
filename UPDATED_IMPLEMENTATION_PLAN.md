# Updated Implementation Plan (December 2024)

## Executive Summary

This plan supersedes the previous plans (ARCHIVING_SERVICES_PLAN.md, IMPLEMENTATION_PLAN_2024.md, ARCHITECTURE_REFACTORING_PLAN.md) based on an evaluation of the current codebase state.

**Key Finding**: The architecture refactoring is ~90% complete. All 5 services registered and Memento pre-checks integrated (Dec 2024). Remaining work: test coverage, legacy cleanup, and Perma.cc API key UI.

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
| Service Registration | ✅ All 5 services registered in MomentO7.ts:58-62 (Dec 2024) |
| Memento Pre-checks | ✅ Integrated into ArchiveCoordinator (Dec 2024) |
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

### 1. ~~Services Not Registered~~ ✅ RESOLVED (Dec 2024)

**Location**: `src/MomentO7.ts:58-62`

```typescript
// All 5 services are now registered:
registry.register('internetarchive', new InternetArchiveService());
registry.register('archivetoday', new ArchiveTodayService());
registry.register('permacc', new PermaCCService());
registry.register('ukwebarchive', new UKWebArchiveService());
registry.register('arquivopt', new ArquivoPtService());
```

**Status**: All archive services are properly registered and available to users.

### 2. ~~Memento Not Integrated~~ ✅ RESOLVED (Dec 2024)

**Location**: `src/services/ArchiveCoordinator.ts:63-143`

MementoChecker is now integrated into ArchiveCoordinator for pre-archive checks.

**Implementation:**
- `checkExistingMemento()` method checks both stored and remote mementos
- New preferences: `checkBeforeArchive`, `archiveAgeThresholdHours`, `skipExistingMementos`
- Returns existing archive info when recent memento found

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

### Phase 1: Wire Up Existing Services ✅ COMPLETE (Dec 2024)

**Goal**: Enable all 5 archive services that are already implemented in TypeScript.

#### Tasks:
1. ✅ Import and register all TypeScript services in MomentO7.ts
2. ✅ Verify each service works with the existing ArchiveCoordinator
3. Test menu items trigger correct services (needs manual testing)
4. ✅ Update preferences defaults if needed

#### Files modified:
- `src/MomentO7.ts` - All 5 services imported and registered at lines 58-62

### Phase 2: Integrate Memento Pre-checks ✅ COMPLETE (Dec 2024)

**Goal**: Check existing archives before creating duplicates.

#### Tasks:
1. ✅ Add MementoChecker integration to ArchiveCoordinator
2. ✅ Add preference for "check before archive" (`checkBeforeArchive`)
3. ✅ Add preference for "archive age threshold" (`archiveAgeThresholdHours`)
4. ✅ Show user when recent archive exists (via `existingArchive` in result)
5. ✅ Allow user to proceed or skip (`skipExistingMementos`)

#### Files modified:
- `src/services/ArchiveCoordinator.ts` - Added `checkExistingMemento()` method
- `src/preferences/PreferencesManager.ts` - Added 3 new preferences
- `src/services/types.ts` - Added preference types

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
1.  ✅ Register ArchiveTodayService in MomentO7.ts (Dec 2024)
2.  ✅ Register PermaCCService in MomentO7.ts (Dec 2024)
3.  ✅ Register UKWebArchiveService in MomentO7.ts (Dec 2024)
4.  ✅ Register ArquivoPtService in MomentO7.ts (Dec 2024)
5.  Test all 5 services work via menu
6.  ✅ Add Memento pre-check to ArchiveCoordinator (Dec 2024)
7.  ✅ Add "check before archive" preference (Dec 2024)
8.  ✅ Add "archive age threshold" preference (Dec 2024)
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

| Metric | Target | Current |
|--------|--------|---------|
| Registered Services | 5 | ✅ 5 (Dec 2024) |
| Test Coverage | 50% | ~15% |
| Legacy JS Files | 0 | 18 |
| Working Memento Pre-check | Yes | ✅ Yes (Dec 2024) |
| Perma.cc API Key UI | Yes | No |

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
