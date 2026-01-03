# Linear Sprint Assignments

## Overview
The 9 Archive Resilience epic tickets have been synced to Linear with IDs DAT-29 through DAT-37. This document maps each Linear issue to its assigned sprint.

---

## Sprint 1: Bug Fixes & Foundation
**Duration**: Week 1-2 (Feb 1-14, 2026)
**Capacity**: 19 story points
**Goal**: Fix critical bugs and implement core resilience pattern

### Issues to Add to Linear Cycle "Sprint 1 - Bug Fixes & Foundation"

| Linear ID | Title | Type | SP | Priority | Status |
|-----------|-------|------|----|----|--------|
| DAT-32 | Implement Circuit Breaker Utility Class | Feature | 5 | HIGH | Backlog |
| DAT-29 | Fix BaseArchiveService item persistence and tagging | Bug | 3 | HIGH | Backlog |
| DAT-31 | Standardize extra field format between writers and readers | Bug | 8 | URGENT | Backlog |
| DAT-37 | Update Documentation for Resilience Features | Docs | 3 | MEDIUM | Backlog |

**Dependencies**: None (DAT-32 is the starting point)

**Execution Order**:
1. **DAT-32** (start immediately) - 5 sp, 3-4 days
   - Establishes circuit breaker foundation for all monitoring work
   - Can be worked in parallel with documentation

2. **DAT-29** (after DAT-32) - 3 sp, 2-3 days
   - Small fix that unblocks DAT-30 and DAT-31
   - High business impact (data persistence)

3. **DAT-31** (can start after DAT-29) - 8 sp, 4-5 days
   - Complex bug fix with backward compatibility concerns
   - High priority due to impact on archiving effectiveness

4. **DAT-37** (parallel to above) - 3 sp spread across sprint
   - Documentation drafting and review cycles
   - Incremental updates as code features complete

**Release Gate**: All 4 issues must be merged before Sprint 2 starts

---

## Sprint 2: Resilience Features
**Duration**: Week 3-4 (Feb 17 - Mar 2, 2026)
**Capacity**: 15-20 story points
**Goal**: Build health checks and fallback capabilities

### Issues to Add to Linear Cycle "Sprint 2 - Resilience Features"

| Linear ID | Title | Type | SP | Priority | Depends On |
|-----------|-------|------|----|----|-----------|
| DAT-30 | Support archiving DOI-only items without URLs | Bug | 5 | HIGH | DAT-29 |
| DAT-33 | Add Health Checks for Archive Services | Feature | 5 | HIGH | DAT-32 |
| DAT-34 | Implement Fallback Archive Strategy | Feature | 5 | HIGH | DAT-32 |

**Dependencies**: DAT-32 (from Sprint 1), DAT-29 (from Sprint 1)

**Execution Order**:
1. **DAT-33 & DAT-34** (can start in parallel) - 5 sp each
   - Both depend on DAT-32 (Circuit Breaker), which completes Sprint 1
   - Health checks are foundational for fallback logic
   - Can be worked by different team members

2. **DAT-30** (after DAT-29 completes in Sprint 1) - 5 sp
   - Final bug fix in the critical trilogy
   - Medium priority but high user impact for academic users

**Carryover**: DAT-37 (Documentation) should be completed by end of Sprint 2

**Release Gate**: All 3 feature issues merged, comprehensive integration test pass

---

## Sprint 3: Monitoring & Alerting
**Duration**: Week 5-6 (Mar 3-16, 2026)
**Capacity**: ~13-16 story points
**Goal**: Build monitoring dashboard and alerting system

### Issues to Add to Linear Cycle "Sprint 3 - Monitoring & Alerting"

| Linear ID | Title | Type | SP | Priority | Depends On |
|-----------|-------|------|----|----|-----------|
| DAT-35 | Build Monitoring Dashboard for Archive Services | Feature | 8 | URGENT | DAT-32, DAT-33 |
| DAT-36 | Add Alerting System for Service Failures | Feature | 5 | HIGH | DAT-32, DAT-33 |

**Dependencies**: DAT-32, DAT-33 (from previous sprints)

**Execution Order**:
1. **DAT-35** (primary focus) - 8 sp, 4-5 days
   - Requires stable health checks (DAT-33)
   - UI-intensive, may need design review
   - High visibility to users

2. **DAT-36** (can parallel DAT-35) - 5 sp, 3-4 days
   - Also depends on health checks
   - Alerting deduplication adds complexity
   - Can be worked independently

**Release Gate**: Both issues merged with user acceptance testing

---

## Linear Cycle Names & Suggested Dates

Create these 3 cycles in Linear:

### Cycle 1: Sprint 1 - Bug Fixes & Foundation
- **Start Date**: Feb 1, 2026 (Saturday)
- **End Date**: Feb 14, 2026 (Friday)
- **Duration**: 2 weeks
- **Issues**: DAT-32, DAT-29, DAT-31, DAT-37
- **Team**: Data (DAT)
- **Scope**: 19 sp

### Cycle 2: Sprint 2 - Resilience Features
- **Start Date**: Feb 17, 2026 (Monday)
- **End Date**: Mar 2, 2026 (Friday)
- **Duration**: 2 weeks
- **Issues**: DAT-30, DAT-33, DAT-34, DAT-37 (completion)
- **Team**: Data (DAT)
- **Scope**: 15-20 sp

### Cycle 3: Sprint 3 - Monitoring & Alerting
- **Start Date**: Mar 3, 2026 (Monday)
- **End Date**: Mar 16, 2026 (Friday)
- **Duration**: 2 weeks
- **Issues**: DAT-35, DAT-36
- **Team**: Data (DAT)
- **Scope**: 13-16 sp

---

## How to Create Cycles in Linear

Linear cycles are created via the web UI (no API support for creation yet):

1. Go to your Linear workspace
2. Navigate to **Projects** → **Cycles**
3. Click **+ New Cycle**
4. Fill in:
   - **Name**: Use the cycle names above
   - **Team**: Select "Data" or your team name
   - **Start Date**: Use the dates provided
   - **End Date**: Use the dates provided
   - **Goals**: Optional - can add epic summary
5. Click **Create**
6. Once created, you can assign issues:
   - Open each issue (DAT-29, DAT-30, etc.)
   - In the right sidebar, set **Cycle** to the appropriate sprint cycle
   - Or use bulk edit to assign multiple issues at once

---

## Summary

**Total Work Across 3 Sprints**: 50 story points

| Sprint | Duration | Capacity | Issues | Focus |
|--------|----------|----------|--------|-------|
| Sprint 1 | 2 weeks | 19 sp | 4 | Bug Fixes & Foundation (Circuit Breaker) |
| Sprint 2 | 2 weeks | 15 sp | 3 | Resilience Features (Health Checks, Fallback) |
| Sprint 3 | 2 weeks | 13 sp | 2 | Monitoring & Alerting |

**Critical Path**: DAT-32 → DAT-29 → {DAT-30, DAT-31}
**Documentation**: Threaded through all sprints, completes by Sprint 2
**Release**: Target May 15, 2026 (12-week epic)

---

## Next Steps

1. **Create 3 Linear cycles** using the dates and names above
2. **Assign the 9 issues** to their respective cycles (bulk assign recommended)
3. **Start Sprint 1** - DAT-32 (Circuit Breaker) is the first task
4. **Track progress** - Review burndown weekly
5. **Adjust as needed** - Move issues between sprints if velocity differs

Once cycles are created in Linear, I can help assign all 9 issues programmatically.
