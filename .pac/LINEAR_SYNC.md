# Linear Sync Report

**Project**: Zotero Moment-o7
**Owner**: Dawson Valdes
**Repository**: https://github.com/dawsonmv/zotero-moment-o7

## Epic: Archive Service Resilience and Observability

**Epic ID**: EPIC-archive-resilience
**Status**: Planned
**Timeline**: 2026-02-01 to 2026-05-15 (12 weeks estimated)

### Summary

Implement circuit breaker patterns and comprehensive monitoring to improve reliability of archive service calls. Addresses cascading failures, graceful degradation, and real-time visibility into plugin health.

---

## Critical Data Integrity Fixes (Priority: HIGH/CRITICAL)

These 3 tickets address critical bugs affecting data durability and core functionality.

### 1. TICKET-fix-item-persistence
- **Status**: Backlog
- **Priority**: HIGH
- **Effort**: 3 story points / 4 hours
- **Component**: archive-services
- **Type**: Bug
- **Description**: BaseArchiveService.saveToItem() mutates item.extra and adds "archived" tag, but never persists changes to Zotero database. Archive metadata is lost on reload.
- **Key Issue**: item.save() not called after mutations; item.addTag() not persisted
- **Impact**: Archive metadata unrecoverable; items never tagged; breaking change from expected behavior
- **Acceptance Criteria**:
  - [ ] item.save() called after mutating item.extra
  - [ ] item.addTag("archived") persisted to database
  - [ ] Archive metadata survives reload
  - [ ] Items appear tagged in Zotero UI
  - [ ] All existing tests pass
  - [ ] New tests verify persistence

### 2. TICKET-support-doi-only-items
- **Status**: Backlog
- **Priority**: HIGH
- **Effort**: 5 story points / 6 hours
- **Component**: archive-coordinator
- **Type**: Bug
- **Description**: ArchiveCoordinator.archiveItem() rejects items without URL field before services get chance to process them, even though services support resolving DOI to https://doi.org/{DOI} via getBestUrl() method.
- **Key Issue**: Precheck at lines 97-101 blocks DOI-only items; RobustLinkCreator uses wrong URL field
- **Impact**: Journal articles with DOI but no direct URL cannot be archived (common academic use case); robust links would have incorrect "original" URLs
- **Acceptance Criteria**:
  - [ ] DOI-only items pass ArchiveCoordinator precheck
  - [ ] Services receive DOI-derived URL via getBestUrl()
  - [ ] RobustLinkCreator uses proper URL for robust links
  - [ ] All 5 services successfully archive DOI items
  - [ ] Error only shown if both URL and DOI missing

### 3. TICKET-fix-extra-field-format
- **Status**: Backlog
- **Priority**: CRITICAL
- **Effort**: 8 story points / 10 hours
- **Component**: metadata-persistence
- **Type**: Bug
- **Description**: Extra field format written by BaseArchiveService.saveToItem() doesn't match patterns used by readers (RobustLinkCreator, MementoChecker). Format mismatch causes duplicate archiving and broken skip-before-archive checks.
- **Key Issue**:
  - Writer uses: `{serviceId}Archived: {url}` (e.g., "internetarchiveArchived: ...")
  - Readers look for: "Internet Archive:", "Archive.today:", "Perma.cc:" (display names)
  - Hardcoded patterns in readers don't support config-driven services
- **Impact**:
  - Duplicate archiving (existing archives invisible)
  - Skip-before-archive feature completely broken
  - Config services (Arquivo.pt, UK Web Archive) never detected
  - Archives become untrackable in Zotero
- **Acceptance Criteria**:
  - [ ] Extra field format consistent between writer and readers
  - [ ] All service formats supported (including config-driven)
  - [ ] No duplicate archiving for already-archived URLs
  - [ ] Skip-before-archive checks work correctly
  - [ ] RobustLinkCreator finds all archived versions
  - [ ] MementoChecker detects all services

---

## Additional Tickets

### 4. TICKET-implement-circuit-breaker
- **Status**: Backlog
- **Priority**: MEDIUM
- **Effort**: Unestimated
- **Component**: archive-services
- **Type**: Feature
- **Description**: Implement circuit breaker pattern for archive service calls to prevent cascading failures when services become unavailable.
- **Key Features**:
  - Circuit breaker for each service
  - Automatic fallback to alternate services
  - Health check mechanism
  - Status monitoring
- **Acceptance Criteria**:
  - [ ] Circuit breaker prevents cascading failures
  - [ ] Health checks detect unavailable services
  - [ ] Fallback to alternate services works
  - [ ] No regressions in existing success rates

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Tickets | 4 |
| Critical Priority | 1 |
| High Priority | 2 |
| Medium Priority | 1 |
| Total Story Points | 16+ |
| Estimated Hours | 20+ |
| Epic Duration | 12 weeks |
| Start Date | 2026-02-01 |
| Target Completion | 2026-05-15 |

## Dependencies

The 3 data integrity fixes should be prioritized and completed before circuit breaker implementation:

1. TICKET-fix-item-persistence (blocks: persistence verification)
2. TICKET-support-doi-only-items (blocks: robust link creation)
3. TICKET-fix-extra-field-format (blocks: archive detection, skip-before-archive)
4. TICKET-implement-circuit-breaker (depends on: above 3 fixes)

## Manual Linear Sync Instructions

If Linear MCP tools are not available, follow these steps to manually create issues:

1. **Create Epic** in Linear:
   - Title: "Archive Service Resilience and Observability"
   - Description: (use Epic description from EPIC-archive-resilience.yaml)
   - Status: Planning
   - Dates: 2026-02-01 to 2026-05-15

2. **Create Issues** under the epic (in priority order):
   - Use ticket names and descriptions above
   - Set status to "Backlog"
   - Link to PAC ticket files in .pac/tickets/
   - Add labels: bug, high-priority, archive-services, metadata-persistence
   - Set effort estimates

3. **Set Dependencies**:
   - TICKET-implement-circuit-breaker depends on the 3 data integrity fixes

4. **Team Assignment**:
   - Default assignee: Dawson Valdes
   - Tag as needed for specific component owners

---

Generated: 2026-01-02T21:45:00Z
PAC Tickets Location: `.pac/tickets/`
Epic Location: `.pac/epics/epic-archive-resilience.yaml`
