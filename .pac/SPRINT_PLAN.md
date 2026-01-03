# Archive Resilience Epic - Sprint Plan

**Epic**: EPIC-archive-resilience
**Timeline**: Feb 1, 2026 - May 15, 2026 (12 weeks)
**Total Effort**: 50 story points across 9 tickets
**Assumed Velocity**: 10-13 sp/week

---

## Dependency Graph

```
DAT-32 (Circuit Breaker)
├── Blocks: DAT-29, DAT-36
├── Enables: DAT-33, DAT-34, DAT-35

DAT-29 (Fix Item Persistence)
├── Depends on: DAT-32
├── Blocks: DAT-30, DAT-31
└── Enables: Core archiving functionality

DAT-30 (DOI Items) → Depends on: DAT-29
DAT-31 (Extra Field Format) → Depends on: DAT-29

DAT-33 (Health Checks) → Can start after: DAT-32
DAT-34 (Fallback Strategy) → Can start after: DAT-32
DAT-35 (Monitoring Dashboard) → Depends on: DAT-32, DAT-33
DAT-36 (Alerting System) → Depends on: DAT-32

DAT-37 (Documentation) → Can run in parallel (updates as features complete)
```

---

## Sprint 1: Bug Fixes & Foundation (Weeks 1-2)

**Focus**: Fix blocking bugs and implement core resilience pattern
**Capacity**: 19 story points
**Goal**: Enable all dependent work and fix critical data integrity issues

| ID     | Ticket                         | Type    | SP  | Status      | Depends On |
| ------ | ------------------------------ | ------- | --- | ----------- | ---------- |
| DAT-32 | Circuit Breaker Implementation | Feature | 5   | Not Started | -          |
| DAT-29 | Fix Item Persistence & Tagging | Bug     | 3   | Not Started | DAT-32     |
| DAT-31 | Fix Extra Field Format         | Bug     | 8   | Not Started | DAT-29     |
| DAT-37 | Update Documentation           | Docs    | 3   | Not Started | All        |

**Sprint 1 Total**: 19 sp

**Rationale**:

- **DAT-32 first** (5 sp): Circuit breaker is the foundation pattern used by monitoring and fallback logic
- **DAT-29 follows** (3 sp): Small fix that unblocks feature work for DOI and extra field issues
- **DAT-31 parallel** (8 sp): High-priority bug fix that depends on DAT-29, can be worked on while others complete DAT-32
- **DAT-37 parallel** (3 sp): Documentation can begin drafting while code is being implemented, updated incrementally

**Success Criteria**:

- ✅ Circuit breaker prevents cascading failures in test scenarios
- ✅ Item persistence bug fixed and verified with reload tests
- ✅ Extra field format consistency established across readers/writers
- ✅ All 3 bug fixes have unit + integration test coverage ≥ 90%
- ✅ Initial documentation sections written and reviewed

**Release Gate**: All 3 bug fixes must pass review and testing before Sprint 2 starts

---

## Sprint 2: Resilience Features (Weeks 3-4)

**Focus**: Build observability and fallback capabilities
**Capacity**: 20 story points (of 28 available)
**Goal**: Complete health checks, fallback logic, and basic dashboard

| ID     | Ticket                 | Type    | SP  | Status      | Depends On |
| ------ | ---------------------- | ------- | --- | ----------- | ---------- |
| DAT-30 | Support DOI-Only Items | Bug     | 5   | Not Started | DAT-29     |
| DAT-33 | Health Checks          | Feature | 5   | Not Started | DAT-32     |
| DAT-34 | Fallback Strategy      | Feature | 5   | Not Started | DAT-32     |

**Sprint 2 Total**: 15 sp (Sprint 1 carryover: 4 sp if DAT-37 completes early)

**Rationale**:

- **DAT-30** (5 sp): Final critical bug fix in bug-fix trilogy, can start once DAT-29 completes
- **DAT-33 & DAT-34** (5 sp each): Foundation monitoring and resilience features that both depend on DAT-32
- Deliberately **defer DAT-35 & DAT-36** to Sprint 3 to keep velocity manageable
- **DAT-37 completes** by end of Sprint 2

**Success Criteria**:

- ✅ DOI-only items can be archived to all 6 services
- ✅ Health checks detect service unavailability within 30 seconds
- ✅ Fallback to secondary service works automatically
- ✅ All 6 archive services have health check coverage
- ✅ Documentation complete with examples

---

## Sprint 3: Monitoring & Alerting (Weeks 5-6)

**Focus**: Dashboard and alerting for operational visibility
**Capacity**: ~16 story points
**Deferred from Sprint 2 due to scope**

| ID     | Ticket               | Type    | SP  | Status      | Depends On     |
| ------ | -------------------- | ------- | --- | ----------- | -------------- |
| DAT-35 | Monitoring Dashboard | Feature | 8   | Not Started | DAT-32, DAT-33 |
| DAT-36 | Alerting System      | Feature | 5   | Not Started | DAT-32, DAT-33 |

**Sprint 3 Total**: 13 sp

**Rationale**:

- Both depend on health checks (DAT-33) which completes in Sprint 2
- Dashboard requires stable metrics collection from health checks
- Alerting requires circuit breaker state changes from health checks
- Deferring to Sprint 3 allows team to absorb and stabilize Sprints 1-2 work

---

## Timeline

```
Week 1-2: Sprint 1 (Critical Fixes) - Feb 1-14
├── DAT-32: Circuit Breaker (5 sp)
├── DAT-29: Item Persistence Fix (3 sp)
├── DAT-31: Extra Field Format Fix (8 sp)
└── DAT-37: Documentation (started, 3 sp)

Week 3-4: Sprint 2 (Resilience Features) - Feb 17 - Mar 2
├── DAT-30: DOI Items (5 sp)
├── DAT-33: Health Checks (5 sp)
├── DAT-34: Fallback Strategy (5 sp)
└── DAT-37: Documentation (completed)

Week 5-6: Sprint 3 (Monitoring) - Mar 3 - Mar 16
├── DAT-35: Monitoring Dashboard (8 sp)
└── DAT-36: Alerting System (5 sp)

Week 7-12: Integration, Testing, Polish & Release - Mar 17 - May 15
```

---

## Resource & Risk Analysis

### Velocity Assumptions

- **Assumed velocity**: 10-13 sp/week
- **Sprint 1**: 19 sp over 2 weeks = 9.5 sp/week (feasible)
- **Sprint 2**: 15 sp over 2 weeks = 7.5 sp/week (conservative, allows slack)
- **Sprint 3**: 13 sp over 2 weeks = 6.5 sp/week (allows integration/polish time)

### High-Risk Items

1. **DAT-32 (Circuit Breaker)** - CRITICAL PATH
   - Risk: Architecture decision on state machine implementation
   - Mitigation: Early architecture review, spike if needed

2. **DAT-31 (Extra Field Format)** - Complex backward compatibility
   - Risk: Format change could break existing items
   - Mitigation: Comprehensive migration tests, backward-compatible design

3. **DAT-35 (Dashboard)** - UI/UX complexity
   - Risk: Performance with real-time metrics
   - Mitigation: Limit historical data window, implement pagination

### Dependencies

- **Critical Path**: DAT-32 → DAT-29 → {DAT-30, DAT-31}
- **Parallel Work**: DAT-37 can start immediately
- **Secondary Path**: DAT-33 & DAT-34 can start once DAT-32 completes

---

## Success Metrics (Per Sprint)

### Sprint 1

- All 3 bug fixes merged with approval
- Test coverage ≥ 90% for critical fixes
- Documentation review cycle complete
- Zero regression in existing tests

### Sprint 2

- Health checks detect 100% of service failures in test
- Fallback logic works for 6/6 archive services
- DOI-only archiving works end-to-end
- Documentation complete and reviewed

### Sprint 3

- Dashboard displays real-time metrics for 6+ services
- Alerting system sends notifications for failures
- Alert deduplication prevents spam
- Integration tests pass for all monitoring paths

---

## Rollout Plan

### Pre-Release (Week 7-11)

- Integration testing: All features together
- Performance testing: No degradation
- User acceptance testing: Docs clear, UI intuitive
- Security review: Credential handling, alert data
- Final documentation review

### Release (Week 12)

- Staged rollout to beta testers
- Monitor early feedback
- Patch critical issues within 48 hours
- Full release with changelog and migration guide

---

## Notes

- This plan assumes a single developer or small team
- If team is larger, could collapse timelines (do Sprints 1-2 concurrently after DAT-32)
- Reserve 1-2 weeks (Weeks 11-12) for bug fixes and polish before release
- Documentation should be reviewed incrementally, not just at end
- Consider feature flag for circuit breaker and fallback during testing
