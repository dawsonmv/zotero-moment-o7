# PAC Workflow Guide

Complete guide for using Product as Code (PAC) in the Zotero Moment-o7 project.

## Table of Contents

1. [Understanding Epics vs Tickets](#understanding-epics-vs-tickets)
2. [Creating Epics](#creating-epics)
3. [Creating Tickets](#creating-tickets)
4. [Managing Status](#managing-status)
5. [Review Process](#review-process)
6. [Common Workflows](#common-workflows)
7. [Tips and Tricks](#tips-and-tricks)

## Understanding Epics vs Tickets

### Epics

**Epics** are large, strategic initiatives. They represent major features or improvements that span multiple months and involve multiple team members.

**Characteristics:**
- Represent 2-8 weeks of work
- Require 5+ related tickets
- Have clear business goals
- Include success metrics
- Contain strategic timeline

**Example Epic:**
```
EPIC-circuit-breaker-resilience
├─ Implement circuit breaker pattern
├─ Add health checks for archive services
├─ Create fallback strategies
└─ Add observability/monitoring
```

### Tickets

**Tickets** are implementation tasks. They represent work items that can be completed by one person in 1-3 days.

**Characteristics:**
- Represent 1-3 days of work
- Linked to a parent epic
- Include acceptance criteria
- Have clear implementation approach
- Fit within a sprint

**Example Tickets (under EPIC-circuit-breaker-resilience):**
```
TICKET-implement-circuit-breaker-pattern
TICKET-add-health-check-endpoint
TICKET-implement-fallback-archive-service
TICKET-add-circuit-breaker-metrics
```

## Creating Epics

### Using the Helper Script

```bash
.pac/scripts/new-epic.sh
```

The script will prompt for:
1. Epic slug (lowercase, hyphenated): `archive-resilience`
2. Epic name: `Archive Service Resilience`
3. Description: "Improve reliability of archive service calls"
4. Owner: Defaults to config owner
5. Target completion: Estimated completion date

### Manual Creation

1. Copy the template:
   ```bash
   cp .pac/templates/epic-template.yaml .pac/epics/epic-your-epic-name.yaml
   ```

2. Edit the file with your favorite editor:
   ```bash
   nano .pac/epics/epic-your-epic-name.yaml
   ```

3. Fill in required fields:
   - `metadata.id`: `EPIC-{slug}` (lowercase, hyphenated)
   - `metadata.name`: Clear, descriptive title
   - `spec.description`: Problem statement and solution
   - `spec.goals`: Strategic impact
   - `spec.scope`: What's in/out of scope
   - `spec.success_criteria`: 3-5 measurable criteria

4. Optional fields:
   - `spec.timeline`: Start date and target completion
   - `spec.dependencies`: Other blocking epics
   - `spec.metrics`: Quantifiable success measures

5. Validate your changes:
   ```bash
   .pac/scripts/validate.sh
   ```

### Epic Template Example

```yaml
apiVersion: productascode.org/v0.1.0
kind: Epic
metadata:
  id: "EPIC-circuit-breaker-resilience"
  name: "Circuit Breaker and Fallback Strategy"
  created: "2026-01-15T10:00:00Z"
  owner: "Dawson Valdes"
  status: "planned"

spec:
  description: |
    Implement circuit breaker pattern and fallback strategies
    to prevent cascading failures when archive services are
    unavailable or rate-limited.

  goals: |
    - Improve plugin stability by preventing repeated calls to failing services
    - Reduce user experience degradation when archive services are down
    - Enable graceful degradation with automatic failover

  scope: |
    In scope:
    - Implement CircuitBreaker utility class
    - Add health checks for all archive services
    - Create fallback logic to try alternate archives
    - Add monitoring and alerting

    Out of scope:
    - Manual service recovery (handled separately)
    - Changes to archive service interfaces

  success_criteria:
    - "Circuit breaker prevents cascading failures"
    - "All archive services have health checks"
    - "Fallback archive service works when primary fails"
    - "Monitoring dashboard tracks circuit breaker state"
    - "User documentation updated"

  timeline:
    start_date: "2026-02-01"
    target_completion: "2026-04-15"
    estimated_effort: "6 weeks"
```

## Creating Tickets

### Using the Helper Script

```bash
.pac/scripts/new-ticket.sh
```

The script will prompt for:
1. Ticket slug: `implement-circuit-breaker`
2. Ticket name: `Implement Circuit Breaker Pattern`
3. Epic ID: `EPIC-circuit-breaker-resilience`
4. Ticket type: `feature`
5. Priority: `high`

### Manual Creation

1. Copy the template:
   ```bash
   cp .pac/templates/ticket-template.yaml .pac/tickets/ticket-your-ticket-name.yaml
   ```

2. Edit with your editor:
   ```bash
   nano .pac/tickets/ticket-your-ticket-name.yaml
   ```

3. Fill required fields:
   - `metadata.id`: `TICKET-{slug}` (must match epic)
   - `metadata.name`: Clear, actionable title
   - `metadata.epic_id`: Parent epic ID
   - `metadata.assignee`: Developer
   - `metadata.type`: `feature|bug|enhancement|refactor|docs|test`
   - `spec.description`: What needs to be done?
   - `spec.acceptance_criteria`: 3-5 checkboxes

4. Implementation details:
   - `implementation_details.approach`: Technical solution
   - `implementation_details.affected_files`: Files to modify
   - `testing_strategy`: How to verify completion

5. Validate:
   ```bash
   .pac/scripts/validate.sh
   ```

### Ticket Example

```yaml
apiVersion: productascode.org/v0.1.0
kind: Ticket
metadata:
  id: "TICKET-implement-circuit-breaker"
  name: "Implement Circuit Breaker Utility Class"
  epic_id: "EPIC-circuit-breaker-resilience"
  created: "2026-01-15T10:30:00Z"
  assignee: "Dawson Valdes"
  type: "feature"
  status: "backlog"
  priority: "high"

spec:
  description: |
    Create a reusable CircuitBreaker utility class that
    monitors archive service calls and prevents cascading
    failures by stopping requests after threshold failures.

  acceptance_criteria:
    - "[ ] CircuitBreaker class implements state machine (closed/open/half-open)"
    - "[ ] Tracks failure count with configurable threshold"
    - "[ ] Auto-resets after configurable timeout"
    - "[ ] Unit tests cover all state transitions"
    - "[ ] Code reviewed and merged"

  implementation_details:
    approach: |
      Implement three-state circuit breaker:
      1. CLOSED: Normal operation, track failures
      2. OPEN: Too many failures, reject calls
      3. HALF_OPEN: Test if service recovered

    affected_files:
      - src/utils/CircuitBreaker.ts
      - tests/utils/CircuitBreaker.test.ts

  testing_strategy: |
    Unit tests covering:
    - State transitions (closed→open→half-open)
    - Failure counting and threshold
    - Auto-reset timer
    - Fallback callback execution

  tasks:
    - "[ ] Create CircuitBreaker class structure"
    - "[ ] Implement state machine logic"
    - "[ ] Add unit tests"
    - "[ ] Add TypeScript documentation"
    - "[ ] Code review"

  estimated_effort: "2 story points"
  labels:
    - "core"
    - "reliability"
```

## Managing Status

Tickets move through these statuses as work progresses:

```
backlog → ready → in_progress → review → testing → done
    ↑                                          ↓
    └──────────── blocked ←──────────────────┘
```

### Status Definitions

| Status | Meaning |
|--------|---------|
| `backlog` | Not yet ready; waiting for prioritization or dependencies |
| `ready` | Prioritized and ready for development |
| `in_progress` | Currently being worked on |
| `review` | Submitted for code review |
| `testing` | In QA/testing phase |
| `done` | Completed and merged |
| `blocked` | Blocked by another ticket (document blocker) |

### Updating Status

Edit the ticket YAML file:

```yaml
metadata:
  status: "in_progress"
```

Commit with message:
```bash
git commit -am "Update ticket status: TICKET-implement-circuit-breaker in_progress"
```

### Updating Acceptance Criteria

Check off items as they're completed:

```yaml
spec:
  acceptance_criteria:
    - "[x] CircuitBreaker class implements state machine"
    - "[x] Tracks failure count with configurable threshold"
    - "[ ] Auto-resets after configurable timeout"
    - "[ ] Unit tests cover all state transitions"
    - "[ ] Code reviewed and merged"
```

## Review Process

### Before Creating a PR

1. **Validate PAC files:**
   ```bash
   .pac/scripts/validate.sh
   ```

2. **Check status progression:**
   - All required fields filled?
   - Acceptance criteria realistic?
   - Ticket linked to correct epic?
   - No duplicate IDs?

### Pull Request Checklist

When creating a PR with PAC changes:

1. Include in PR description:
   ```markdown
   ## PAC Changes
   - Created EPIC-feature-name
   - Created TICKET-feature-detail
   - Updated TICKET-other-ticket status
   ```

2. Link to related issues/discussions

3. Include reviewers who can validate:
   - Epic goals align with strategy
   - Tickets are properly decomposed
   - Timelines are realistic

### Review Comments

Reviewers should check:

- **Epic-level:**
  - Goals are clear and strategic?
  - Scope is well-defined?
  - Success criteria are measurable?
  - Timeline is realistic?

- **Ticket-level:**
  - Acceptance criteria are specific?
  - Ticket is achievable in 1-3 days?
  - Implementation approach is sound?
  - Related tickets are properly linked?

## Common Workflows

### Starting a New Feature

1. **Create Epic:**
   ```bash
   .pac/scripts/new-epic.sh
   # Follow prompts, creates EPIC-feature-name
   ```

2. **Decompose into Tickets:**
   Create 5-10 related tickets under the epic
   ```bash
   .pac/scripts/new-ticket.sh
   # Parent: EPIC-feature-name
   ```

3. **Create PR:**
   ```bash
   git checkout -b feature/epic-name
   git add .pac/
   git commit -m "feat: Create EPIC-feature-name with initial tickets"
   git push -u origin feature/epic-name
   # Create PR for team review
   ```

### Starting Work on a Ticket

1. **Update status:**
   ```yaml
   metadata:
     status: "ready"  # Then to "in_progress"
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/ticket-name
   ```

3. **Update during work:**
   Check off acceptance criteria as you complete them

### Completing a Ticket

1. **Finish implementation:**
   - All acceptance criteria met
   - Tests passing
   - Code reviewed

2. **Update ticket:**
   ```yaml
   metadata:
     status: "done"
   spec:
     acceptance_criteria:
       - "[x] All items checked"
   ```

3. **Commit:**
   ```bash
   git commit -am "feat: Complete TICKET-feature-detail"
   ```

### Completing an Epic

1. **Verify all tickets done:**
   ```bash
   .pac/scripts/validate.sh  # Check all related tickets
   ```

2. **Update epic:**
   ```yaml
   metadata:
     status: "completed"
   ```

3. **Create PR:**
   ```bash
   git commit -am "feat: Complete EPIC-feature-name"
   ```

## Tips and Tricks

### Linking Between Files

Reference tickets in epic descriptions:
```markdown
Related Tickets:
- TICKET-implement-circuit-breaker
- TICKET-add-health-checks
- TICKET-create-fallback-logic
```

### Organizing Large Epics

Break very large epics (8+ weeks) into phases:

```yaml
spec:
  phases:
    - name: "Phase 1: Core Implementation"
      target_date: "2026-03-01"
      tickets:
        - TICKET-phase-1-task-1
        - TICKET-phase-1-task-2

    - name: "Phase 2: Integration"
      target_date: "2026-04-15"
      tickets:
        - TICKET-phase-2-task-1
```

### Quick Status Check

See all active work:
```bash
grep -l "status: \"in_progress\"" .pac/tickets/*.yaml
```

See all blocked tickets:
```bash
grep -l "status: \"blocked\"" .pac/tickets/*.yaml
```

### Updating Related Tickets

When blocking relationships change:
```yaml
spec:
  blockers:
    - TICKET-blocking-ticket
  related_tickets:
    - TICKET-similar-work
```

### Estimating Effort

Consistent story points help with planning:
- 1 point: Few hours
- 2 points: 1 day
- 3 points: 1-2 days
- 5 points: Multiple days
- 8+ points: Split into smaller tickets

Record in ticket:
```yaml
metadata:
  estimated_effort: "3 story points"
```

## Questions?

- Review the main [README.md](./README.md)
- Check the [pac.config.yaml](./pac.config.yaml) for configuration
- Run validation: `.pac/scripts/validate.sh`
- Create an issue in the main repository
