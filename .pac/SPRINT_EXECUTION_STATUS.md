# Sprint Creation & Assignment Execution Status

**Generated**: 2026-01-02
**Status**: Ready for Execution
**Team**: Datamine (DAT)
**Total Effort**: 50 story points across 9 issues

---

## Executive Summary

The sprint infrastructure for the Archive Resilience Epic is fully prepared and ready for execution. All prerequisites have been met:

- **9 Linear issues created** (DAT-29 through DAT-37) with full specifications
- **2 automation scripts ready** to create sprints and assign issues
- **Detailed sprint plans documented** with dependencies and execution order
- **API infrastructure verified** (Linear GraphQL endpoint and team ID confirmed)

**Next Step**: Provide Linear API key to execute automation scripts

---

## Infrastructure Status

### Issue Creation: ✅ COMPLETE

All 9 issues have been synced to Linear with proper metadata:

| Sprint    | Issues                         | Story Points | Status    |
| --------- | ------------------------------ | ------------ | --------- |
| Sprint 1  | DAT-32, DAT-29, DAT-31, DAT-37 | 19           | Created   |
| Sprint 2  | DAT-30, DAT-33, DAT-34         | 15           | Created   |
| Sprint 3  | DAT-35, DAT-36                 | 13           | Created   |
| **TOTAL** | **9 issues**                   | **50 sp**    | **Ready** |

### Automation Scripts: ✅ COMPLETE

Two production-ready bash scripts have been created:

#### 1. Create Sprints Script

**File**: `/Users/dawsonvaldes/Documents/GitHub-Repos/zotero-momento7-new/.pac/create-sprints.sh`

**Functionality**:

- Creates 3 Linear cycles with exact dates specified
- Sprint 1: Feb 1-14, 2026
- Sprint 2: Feb 17 - Mar 2, 2026
- Sprint 3: Mar 3-16, 2026
- Uses Linear GraphQL API for reliable automation
- Error handling with clear error messages
- Returns cycle IDs for reference

**Requirements**:

- LINEAR_API_KEY environment variable set
- Valid Linear team ID (already hardcoded: 0c640fe8-9c50-4581-827b-cc0678dcde4a)
- Network access to api.linear.app

#### 2. Assign Issues Script

**File**: `/Users/dawsonvaldes/Documents/GitHub-Repos/zotero-momento7-new/.pac/assign-issues-to-sprints.sh`

**Functionality**:

- Fetches the 3 most recent cycles created
- Assigns all 9 issues to correct cycles:
  - DAT-32, DAT-29, DAT-31, DAT-37 → Sprint 1
  - DAT-30, DAT-33, DAT-34 → Sprint 2
  - DAT-35, DAT-36 → Sprint 3
- Automatic cycle ID extraction (no manual copy/paste needed)
- Progress indicators for each assignment

**Requirements**:

- LINEAR_API_KEY environment variable set
- Sprints created first (by create-sprints.sh)
- All 9 issues exist in Linear (verified)

### Documentation: ✅ COMPLETE

Supporting documentation has been created:

| Document                   | Purpose                                     | Location                          |
| -------------------------- | ------------------------------------------- | --------------------------------- |
| SPRINT_PLAN.md             | Detailed sprint planning with dependencies  | `.pac/SPRINT_PLAN.md`             |
| SPRINT_ASSIGNMENTS.md      | Issue-to-sprint mapping and execution order | `.pac/SPRINT_ASSIGNMENTS.md`      |
| SPRINT_SETUP.md            | User-friendly setup instructions            | `.pac/SPRINT_SETUP.md`            |
| SPRINT_EXECUTION_STATUS.md | This document                               | `.pac/SPRINT_EXECUTION_STATUS.md` |

---

## Execution Steps

### Phase 1: Create Linear Cycles (< 1 minute)

```bash
cd /Users/dawsonvaldes/Documents/GitHub-Repos/zotero-momento7-new

# Set API key (from https://linear.app/settings/api)
export LINEAR_API_KEY="lin_your_api_key_here"

# Execute sprint creation
bash .pac/create-sprints.sh

# Verify output shows 3 successful cycle creations with IDs
```

**Expected Output**:

```
===============================================
Creating Archive Resilience Sprints
===============================================

Sprint 1: Bug Fixes & Foundation
Issues: DAT-32, DAT-29, DAT-31, DAT-37
Creating cycle: Sprint 1 - Bug Fixes & Foundation
  Start: 2026-02-01
  End:   2026-02-14
  ✅ Created with ID: cycle_xxxxx...

Sprint 2: Resilience Features
Issues: DAT-30, DAT-33, DAT-34, (DAT-37 completion)
Creating cycle: Sprint 2 - Resilience Features
  Start: 2026-02-17
  End:   2026-03-02
  ✅ Created with ID: cycle_yyyyy...

Sprint 3: Monitoring & Alerting
Issues: DAT-35, DAT-36
Creating cycle: Sprint 3 - Monitoring & Alerting
  Start: 2026-03-03
  End:   2026-03-16
  ✅ Created with ID: cycle_zzzzz...

===============================================
✅ All 3 sprints created successfully!
===============================================
```

### Phase 2: Assign Issues to Sprints (< 1 minute)

```bash
# Execute issue assignment (LINEAR_API_KEY still exported)
bash .pac/assign-issues-to-sprints.sh
```

**Expected Output**:

```
===============================================
Assigning Issues to Sprints
===============================================

Sprint 1 (Bug Fixes & Foundation):
  ✅ DAT-32 → Sprint 1
  ✅ DAT-29 → Sprint 1
  ✅ DAT-31 → Sprint 1
  ✅ DAT-37 → Sprint 1

Sprint 2 (Resilience Features):
  ✅ DAT-30 → Sprint 2
  ✅ DAT-33 → Sprint 2
  ✅ DAT-34 → Sprint 2

Sprint 3 (Monitoring & Alerting):
  ✅ DAT-35 → Sprint 3
  ✅ DAT-36 → Sprint 3

===============================================
✅ All issues assigned to sprints!
===============================================
```

### Phase 3: Clean Up

```bash
# Remove API key from environment
unset LINEAR_API_KEY

# Verify
env | grep LINEAR_API_KEY
# (should return nothing)
```

### Phase 4: Verification

Go to https://linear.app/datamine/cycles and verify:

- [ ] Sprint 1 exists with name "Sprint 1 - Bug Fixes & Foundation"
  - [ ] Dates: Feb 1-14, 2026
  - [ ] Contains: DAT-32, DAT-29, DAT-31, DAT-37 (4 issues)
  - [ ] Story points: 19

- [ ] Sprint 2 exists with name "Sprint 2 - Resilience Features"
  - [ ] Dates: Feb 17 - Mar 2, 2026
  - [ ] Contains: DAT-30, DAT-33, DAT-34 (3 issues)
  - [ ] Story points: 15

- [ ] Sprint 3 exists with name "Sprint 3 - Monitoring & Alerting"
  - [ ] Dates: Mar 3-16, 2026
  - [ ] Contains: DAT-35, DAT-36 (2 issues)
  - [ ] Story points: 13

---

## Sprint Specifications

### Sprint 1: Bug Fixes & Foundation

**Duration**: 2 weeks (Feb 1-14, 2026)
**Capacity**: 19 story points
**Team**: Datamine (DAT)
**Goal**: Fix critical bugs and establish circuit breaker foundation

| ID     | Issue                             | Type    | SP  | Priority | Deps   |
| ------ | --------------------------------- | ------- | --- | -------- | ------ |
| DAT-32 | Implement Circuit Breaker Utility | Feature | 5   | HIGH     | None   |
| DAT-29 | Fix Item Persistence & Tagging    | Bug     | 3   | HIGH     | DAT-32 |
| DAT-31 | Standardize Extra Field Format    | Bug     | 8   | URGENT   | DAT-29 |
| DAT-37 | Update Documentation              | Docs    | 3   | MEDIUM   | All    |

**Execution Order**:

1. DAT-32 (foundation - start first)
2. DAT-29 (small fix, unblocks others)
3. DAT-31 (complex, high impact)
4. DAT-37 (documentation, parallel)

**Release Gate**: All 4 merged and tested before Sprint 2 starts

### Sprint 2: Resilience Features

**Duration**: 2 weeks (Feb 17 - Mar 2, 2026)
**Capacity**: 15 story points
**Team**: Datamine (DAT)
**Goal**: Implement health checks and fallback capabilities

| ID     | Issue                       | Type    | SP  | Priority | Deps   |
| ------ | --------------------------- | ------- | --- | -------- | ------ |
| DAT-30 | Support DOI-Only Items      | Bug     | 5   | HIGH     | DAT-29 |
| DAT-33 | Add Health Checks           | Feature | 5   | HIGH     | DAT-32 |
| DAT-34 | Implement Fallback Strategy | Feature | 5   | HIGH     | DAT-32 |

**Execution Order**:

1. DAT-33 & DAT-34 (parallel, both depend on DAT-32 from Sprint 1)
2. DAT-30 (after DAT-29 completes in Sprint 1)

**Carryover**: DAT-37 documentation completion from Sprint 1

**Release Gate**: All 3 features integrated and tested

### Sprint 3: Monitoring & Alerting

**Duration**: 2 weeks (Mar 3-16, 2026)
**Capacity**: 13 story points
**Team**: Datamine (DAT)
**Goal**: Build dashboard and alerting system

| ID     | Issue                | Type    | SP  | Priority | Deps           |
| ------ | -------------------- | ------- | --- | -------- | -------------- |
| DAT-35 | Monitoring Dashboard | Feature | 8   | URGENT   | DAT-32, DAT-33 |
| DAT-36 | Alerting System      | Feature | 5   | HIGH     | DAT-32, DAT-33 |

**Execution Order**:

1. DAT-35 & DAT-36 (can be parallel)

**Release Gate**: Both features in production with UAT approval

---

## Critical Path Analysis

```
DAT-32 (Circuit Breaker)
├── Blocks: All Sprint 2 & 3 work
├── Duration: 3-4 days
└── Impact: CRITICAL - Foundation for entire epic

DAT-29 (Item Persistence Fix)
├── Depends on: DAT-32
├── Unblocks: DAT-30, DAT-31
├── Duration: 2-3 days
└── Impact: HIGH - Data durability

DAT-31 (Extra Field Format Fix)
├── Depends on: DAT-29
├── Duration: 4-5 days
└── Impact: CRITICAL - Prevents duplicate archiving

DAT-30 (DOI Items Support)
├── Depends on: DAT-29
├── Duration: 3-4 days
└── Impact: HIGH - Academic users

DAT-33 (Health Checks)
├── Depends on: DAT-32
├── Unblocks: DAT-35, DAT-36
├── Duration: 3-4 days
└── Impact: MEDIUM - Foundation for monitoring

DAT-34 (Fallback Strategy)
├── Depends on: DAT-32
├── Duration: 3-4 days
└── Impact: MEDIUM - Resilience feature

DAT-35 (Dashboard)
├── Depends on: DAT-32, DAT-33
├── Duration: 4-5 days
└── Impact: HIGH - User visibility

DAT-36 (Alerting)
├── Depends on: DAT-32, DAT-33
├── Duration: 3-4 days
└── Impact: HIGH - Operational alerts

DAT-37 (Documentation)
├── Depends on: All features
├── Duration: Spread across all sprints
└── Impact: MEDIUM - Knowledge transfer
```

**Minimum Critical Path**: DAT-32 → DAT-29 → DAT-31 (10-12 days)

---

## API Integration Details

### Linear GraphQL Endpoint

- **URL**: https://api.linear.app/graphql
- **Auth**: Bearer token via Authorization header
- **Format**: JSON request bodies with GraphQL queries

### Team Configuration

- **Team Name**: Datamine
- **Team Prefix**: DAT
- **Team UUID**: 0c640fe8-9c50-4581-827b-cc0678dcde4a (hardcoded in scripts)
- **Issues**: DAT-29 through DAT-37

### Cycle Creation Mutation

```graphql
mutation CreateCycle($input: CycleCreateInput!) {
  cycleCreate(input: $input) {
    success
    cycle {
      id
      name
    }
  }
}
```

### Issue Assignment Mutation

```graphql
mutation UpdateIssue($input: IssueUpdateInput!) {
  issueUpdate(id: "ISSUE_ID", input: $input) {
    success
    issue {
      identifier
      title
    }
  }
}
```

---

## Troubleshooting Guide

### Issue: "LINEAR_API_KEY environment variable not set"

**Solution**:

```bash
export LINEAR_API_KEY="lin_your_key_here"
```

Get your key from: https://linear.app/settings/api

### Issue: "Error creating cycle"

**Possible causes**:

1. Invalid API key - regenerate at https://linear.app/settings/api
2. Expired API key - create a new one
3. Insufficient permissions - ensure you have cycle creation rights
4. Team not found - verify team UUID is correct

**Debug**:

```bash
# Test API connectivity
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name } }"}'
```

### Issue: "Issues not assigning"

**Possible causes**:

1. Cycles not created - run create-sprints.sh first
2. Wrong issue IDs - verify DAT-29 through DAT-37 exist
3. Stale API key - try refreshing it

**Debug**:

```bash
# List existing cycles
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { cycles(first: 10) { nodes { id name } } }"}'
```

### Issue: "HTTP 429 - Rate Limited"

**Solution**:

- Linear API allows 1000 requests per minute
- The scripts make minimal requests - unlikely unless run many times
- Wait 1 minute and retry

---

## Manual Fallback Process

If the scripts fail completely, sprints can be created manually:

1. Go to https://linear.app/datamine/cycles
2. Click "+ New Cycle"
3. Fill in form:
   - **Name**: (from SPRINT_ASSIGNMENTS.md)
   - **Team**: Select "Datamine" or "DAT"
   - **Starts**: (exact date from plan)
   - **Ends**: (exact date from plan)
4. Click Create
5. For each issue:
   - Open issue in Linear
   - Click "Cycle" in right sidebar
   - Select appropriate sprint
   - Save

**Time estimate**: 5-10 minutes for complete manual setup

---

## Success Metrics

### Pre-Execution Checklist

- [ ] All 9 issues exist in Linear (DAT-29 through DAT-37)
- [ ] Create-sprints.sh script is executable (chmod +x)
- [ ] Assign-issues-to-sprints.sh script is executable
- [ ] Linear API key obtained and secret
- [ ] Team ID verified: 0c640fe8-9c50-4581-827b-cc0678dcde4a

### Post-Execution Checklist

- [ ] 3 sprints created in Linear with correct dates
- [ ] All 9 issues assigned to correct sprints
- [ ] No duplicate assignments
- [ ] Story point totals correct per sprint
- [ ] Issue dependencies documented and visible
- [ ] LINEAR_API_KEY removed from environment
- [ ] No API key exposed in git history

---

## Next Steps After Execution

1. **Review Sprint 1 Plan**: Prioritize DAT-32 (Circuit Breaker) as first task
2. **Schedule Kickoff**: Quick sync to review dependencies and execution order
3. **Set Up Tracking**: Configure burndown charts in Linear
4. **Assign Sprint 1 Issues**: Distribute DAT-29, DAT-31, DAT-37 among team
5. **Create Feature Branches**: Start work on DAT-32 immediately
6. **Weekly Reviews**: Track progress against 2-week sprint cycle

---

## Files Referenced

| File                               | Purpose                                |
| ---------------------------------- | -------------------------------------- |
| `.pac/create-sprints.sh`           | Bash script to create 3 Linear cycles  |
| `.pac/assign-issues-to-sprints.sh` | Bash script to assign all 9 issues     |
| `.pac/SPRINT_PLAN.md`              | Detailed sprint planning and rationale |
| `.pac/SPRINT_ASSIGNMENTS.md`       | Issue-to-sprint mapping reference      |
| `.pac/SPRINT_SETUP.md`             | User-friendly setup guide              |
| `.pac/SPRINT_EXECUTION_STATUS.md`  | This document                          |

---

## Technical Notes

### API Security

- **Never commit API key** to git
- **Use `unset LINEAR_API_KEY`** after execution
- **Regenerate key** if exposed
- **Use environment variables**, not hardcoded strings

### Script Robustness

- Both scripts use `set -e` for fail-fast execution
- Error handling with jq for JSON parsing
- Clear success/failure messages
- Idempotent cycle creation (safe to retry)

### Data Integrity

- Scripts validate API responses before proceeding
- All issue IDs hardcoded (no external config needed)
- Cycle IDs extracted automatically (no manual entry)
- Both scripts designed for operator confirmation

---

## Related Documentation

- **Epic Definition**: `.pac/epics/epic-archive-resilience.yaml`
- **Ticket Details**: `.pac/tickets/` directory
- **Release Notes**: Will be updated post-execution

---

**Generated**: 2026-01-02
**Last Updated**: 2026-01-02
**Status**: Ready for Execution
**Next Action**: Obtain LINEAR_API_KEY and execute scripts
