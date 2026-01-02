# PAC (Product as Code) Structure

This directory contains the Product as Code (PAC) configuration for **Zotero Moment-o7**, following the [Product as Code specification](https://productascode.org).

## What is Product as Code?

Product as Code treats product management, planning, and tracking as first-class code artifacts. All product decisions, epics, and tickets are versioned in Git, enabling:

- **Version Control**: Full history of product changes
- **Code Review**: Product planning reviewed like code
- **Automation**: CI/CD integration for product workflows
- **Traceability**: Link issues to epics to strategic goals
- **Collaboration**: Team discussions and decisions in PRs

## Directory Structure

```
.pac/
├── pac.config.yaml          # PAC configuration and defaults
├── epics/                   # Epic definitions
│   └── epic-*.yaml         # Individual epics
├── tickets/                 # Ticket definitions
│   └── ticket-*.yaml       # Individual tickets
├── templates/               # Reusable templates
│   ├── epic-template.yaml
│   └── ticket-template.yaml
├── scripts/                 # Helper and validation scripts
│   ├── validate.sh         # PAC validation
│   ├── new-epic.sh         # Create new epics
│   └── new-ticket.sh       # Create new tickets
├── README.md               # This file
└── GUIDE.md                # Quick start guide
```

## Quick Start

### 1. Create a New Epic

```bash
.pac/scripts/new-epic.sh "Feature Name" "Description"
```

Or manually:

```bash
cp .pac/templates/epic-template.yaml .pac/epics/epic-feature-name.yaml
# Edit the file with your epic details
.pac/scripts/validate.sh
```

### 2. Create a New Ticket

```bash
.pac/scripts/new-ticket.sh "Ticket Name" "EPIC-feature-name"
```

Or manually:

```bash
cp .pac/templates/ticket-template.yaml .pac/tickets/ticket-feature-detail.yaml
# Edit the file with your ticket details
.pac/scripts/validate.sh
```

### 3. Update Ticket Status

Edit the `status` field in the ticket YAML file:

- `backlog` - Not yet ready to work on
- `ready` - Ready for development
- `in_progress` - Currently being worked on
- `review` - Under code review
- `testing` - In testing phase
- `done` - Completed
- `blocked` - Blocked by another ticket

### 4. Validate PAC Files

Run validation to check syntax and consistency:

```bash
.pac/scripts/validate.sh
```

## Configuration

The `pac.config.yaml` file defines:

- **Project metadata**: Name, owner, organization
- **Defaults**: Assignee, prefixes, priority levels
- **Validation rules**: Unique IDs, required fields
- **Naming conventions**: Epic and ticket ID patterns
- **Ticket types and statuses**: Available values

### Default Assignee

Currently set to **Dawson Valdes**. Update in `pac.config.yaml`:

```yaml
spec:
  defaults:
    assignee: "New Assignee Name"
```

## Naming Conventions

### Epic IDs

- Format: `EPIC-{slug}`
- Example: `EPIC-archive-service-reliability`
- Pattern: lowercase letters, numbers, and hyphens

### Ticket IDs

- Format: `TICKET-{slug}`
- Example: `TICKET-implement-circuit-breaker`
- Pattern: lowercase letters, numbers, and hyphens

## Epic Template

Key sections in an epic:

```yaml
metadata:
  id: "EPIC-feature-name"
  name: "Descriptive Epic Name"
  owner: "Assignee"
  status: "planned|active|completed|on_hold"

spec:
  description: "What problem does this solve?"
  goals: "Strategic goals"
  scope: "What's included/excluded"
  success_criteria:
    - "Measurable criterion 1"
    - "Measurable criterion 2"
  timeline:
    start_date: "2026-01-01"
    target_completion: "2026-03-01"
  tickets:
    - "TICKET-related-ticket-1"
    - "TICKET-related-ticket-2"
```

## Ticket Template

Key sections in a ticket:

```yaml
metadata:
  id: "TICKET-feature-detail"
  name: "Implementation Task"
  epic_id: "EPIC-parent-feature"
  assignee: "Developer Name"
  type: "feature|bug|enhancement|refactor|docs|test"
  status: "backlog|ready|in_progress|review|testing|done|blocked"
  priority: "critical|high|medium|low"

spec:
  description: "What needs to be done?"
  problem_statement: "Why is this needed?"
  acceptance_criteria:
    - "[ ] Acceptance criterion 1"
    - "[ ] Acceptance criterion 2"
  implementation_details:
    approach: "Technical approach"
    affected_files:
      - "src/module/file.ts"
  testing_strategy: "How will this be tested?"
  tasks:
    - "[ ] Subtask 1"
    - "[ ] Subtask 2"
```

## Workflows

### Create an Epic

1. Define strategic goals and scope
2. List related tickets
3. Set timeline estimates
4. Create in `.pac/epics/epic-{name}.yaml`
5. Validate with `.pac/scripts/validate.sh`
6. Commit and push for review

### Create a Ticket

1. Link to parent epic
2. Write clear description and acceptance criteria
3. Define implementation approach
4. List affected files and dependencies
5. Create in `.pac/tickets/ticket-{name}.yaml`
6. Validate and commit

### Update Progress

1. Edit ticket status as work progresses
2. Mark acceptance criteria as completed
3. Commit changes with descriptive messages
4. Link to GitHub issues for visibility

### Start a Feature

1. Move epic status from `planned` to `active`
2. Create related tickets
3. Assign tickets to team members
4. Commit changes and create GitHub issue

## Integration with GitHub

### Linking Tickets to Issues

Add GitHub issue links in PAC files:

```yaml
spec:
  links:
    - title: "GitHub Issue"
      url: "https://github.com/dawsonmv/zotero-moment-o7/issues/123"
```

### CI/CD Integration

Run validation in CI pipeline:

```yaml
- name: Validate PAC
  run: .pac/scripts/validate.sh
```

## Best Practices

1. **Keep descriptions clear and concise**
   - Use active voice
   - Explain the "why" not just the "what"

2. **Link related items**
   - Reference parent epics in tickets
   - Use `blockers` and `related_tickets` fields

3. **Update status regularly**
   - Reflect actual progress
   - Use status to answer "what's happening now?"

4. **Validate before commit**
   - Run `.pac/scripts/validate.sh` before pushing
   - Fix YAML syntax errors early

5. **Version important decisions**
   - Commit rationale in epic descriptions
   - Reference design documents

6. **Keep acceptance criteria realistic**
   - Should be verifiable
   - Typically 3-5 per ticket

## Troubleshooting

### Validation fails with "yq not found"

Install yq for full YAML validation:

```bash
# macOS
brew install yq

# Linux
sudo apt-get install yq
```

### Duplicate ID errors

Check for typos in epic/ticket IDs. Each must be globally unique.

### Broken epic-ticket links

Ensure ticket `epic_id` matches an existing epic filename.

## Related Files

- `pac.config.yaml` - PAC configuration
- `GUIDE.md` - Detailed workflow guide
- `/scripts/validate.sh` - Validation script
- `/scripts/new-epic.sh` - Epic creation helper
- `/scripts/new-ticket.sh` - Ticket creation helper

## Resources

- [Product as Code Specification](https://productascode.org)
- [YAML Syntax Reference](https://yaml.org/spec/1.2/)
- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)

## Questions?

Refer to the detailed `GUIDE.md` or create an issue in the main repository.
