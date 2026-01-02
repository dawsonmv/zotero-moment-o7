# Task Orchestration Guide

This project uses the Orchestration Commit System for synchronized task tracking and version control.

## Quick Start

### View Current Task Status
```bash
/orchestration:status
```

Shows all tasks with their status, commits, and completion percentage.

### Commit for Current Task
```bash
/orchestration:commit
```

Automatically creates a commit message based on the task in `in_progress` status.

### Move Task to Next Status
```bash
/orchestration:move TASK-009 in_progress
```

Transitions task through: `todos` → `in_progress` → `qa` → `complete`

### Auto-commit on Status Change
```bash
/orchestration:move TASK-009 qa --auto-commit
```

Moves task to QA and creates commit automatically.

## Task Structure

### Task ID Format
- **EPIC-001**: Epic (long-running feature)
- **TASK-001**: Individual task within epic

### Task Types
- `feature`: New functionality
- `bugfix`: Bug fixes
- `test`: Test coverage
- `docs`: Documentation
- `refactor`: Code refactoring
- `perf`: Performance optimization
- `security`: Security fixes

### Task Statuses
```
todos → in_progress → qa → complete
        ↓
      blocked ← (can return to in_progress)
```

## Current Epic: Traffic Monitoring & Concurrent Archiving

### Completed Tasks (TASK-001 through TASK-008)
- ✅ TrafficMonitor utility
- ✅ ConcurrentArchiveQueue
- ✅ ArchiveCoordinator integration
- ✅ HTTP request wrapping
- ✅ Integration testing
- ✅ Documentation and build system
- ✅ Build artifacts in repository
- ✅ Plugin rebuild

### Pending Tasks
- ⏳ **TASK-009**: Functional testing in Zotero (CRITICAL - required for merge)

## Workflow Examples

### Example 1: Start Work on Pending Task
```bash
# Move task to in_progress
/orchestration:move TASK-009 in_progress

# Work on the task...
# (Run tests, make changes, etc.)

# When ready for testing, move to QA with auto-commit
/orchestration:move TASK-009 qa --auto-commit
```

### Example 2: Create New Feature Task
```bash
# Check status
/orchestration:status

# Create new task (via CLI or manually in TASK-STATUS-TRACKER.yaml)
# Add task to TASK-STATUS-TRACKER.yaml with:
#   - id: TASK-010
#   - type: feature
#   - title: Your feature
#   - status: todos

# Move to in_progress when starting work
/orchestration:move TASK-010 in_progress

# Commit with auto-generated message
/orchestration:commit TASK-010

# Verify changes with validation
/orchestration:commit TASK-010 --validate

# Move to QA when ready
/orchestration:move TASK-010 qa --auto-commit
```

### Example 3: Batch Commits for Related Tasks
```bash
# Group related completed tasks
/orchestration:commit --feature authentication --batch

# This will:
# 1. Find all tasks tagged with feature: authentication
# 2. Group them into logical commits
# 3. Create commits following Conventional Commits spec
```

## Integration with Git

### Automatic Commit Messages
Based on TASK-STATUS-TRACKER.yaml, commits are auto-generated:

```
feat(traffic): implement TrafficMonitor utility

- Singleton pattern for global state management
- 1-second delayed timer start for request tracking
- Jamming detection at score >= 2.0
- Mean score calculation excluding invalid values

Task: TASK-001
Status: in_progress → qa
Duration: 6 hours
Commits: a6f04f5
```

### Manual Commit Override
```bash
/orchestration:commit TASK-001 --message "Custom commit message"
```

## Git Tracking in TASK-STATUS-TRACKER.yaml

The `git_tracking` section maintains mapping between:
- **Task ID** ↔ **Git commit hash**
- **Task description** ↔ **Commit message**
- **Task files** ↔ **Modified files**

Example:
```yaml
git_tracking:
  TASK-001:
    commits: ["a6f04f5"]
    commit_message: "feat(traffic): implement TrafficMonitor utility..."
    files_modified:
      - src/utils/TrafficMonitor.ts
    tests_added: 23
    committed_at: 2025-12-20
```

## Status Dashboard

View the complete project status:
```bash
cat TASK-STATUS-TRACKER.yaml | grep -A 5 "git_tracking:"
```

Shows:
- All commits and their task IDs
- Test counts per task
- Duration tracking
- Completion dates

## Best Practices

### 1. Update Task Status First
```bash
/orchestration:move TASK-009 in_progress
# ... do work ...
/orchestration:move TASK-009 qa --auto-commit
```

Not:
```bash
git commit -m "..."
# Then update task manually
```

### 2. Keep Task Descriptions Updated
Update TASK-STATUS-TRACKER.yaml as you work:
```yaml
TASK-009:
  status: in_progress
  notes: |
    - Testing plugin installation in Zotero 7.0.1
    - Completed Phase 1-4 testing
    - In progress: Phase 5 (fallback chain)
```

### 3. Link Related Tasks
```yaml
TASK-010:
  blocks: [TASK-011]
  blocked_by: [TASK-009]
  related_to: [TASK-003, TASK-004]
```

### 4. Document Decision Points
```yaml
TASK-009:
  notes: |
    Decision: Run full 12-phase testing before merge
    Rationale: User requirement for functional validation
    Testing checklist: TESTING_CHECKLIST.md
```

## Validation Before Commit

```bash
/orchestration:commit TASK-009 --validate
```

Checks:
- ✓ All tests passing
- ✓ No linting errors
- ✓ Task requirements met
- ✓ Files match task scope
- ✓ No unrelated changes included

## Integration with Linear (Optional)

If using Linear issue tracking:
```bash
/orchestration:commit TASK-009 --link-task
```

Adds Linear issue link to commit message:
```
feat(testing): complete functional testing in Zotero

Task: TASK-009
Linear: https://linear.app/momento7/issue/MO-9
```

## Viewing Task History

```bash
# Show all completed tasks
/orchestration:status --filter complete

# Show task timeline
/orchestration:report --timeline

# Show task-to-commit mapping
/orchestration:report --git-map
```

## Notes

- TASK-STATUS-TRACKER.yaml is the single source of truth
- Update it as tasks progress
- Commits automatically reference task IDs
- Use for reporting and auditing
- Enables CI/CD automation based on task status

---

**Current Focus**: TASK-009 - Functional testing in Zotero (CRITICAL for merge)

For detailed task information, see TASK-STATUS-TRACKER.yaml
