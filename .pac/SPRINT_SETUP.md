# Sprint Setup Instructions

This guide walks you through creating and configuring the 3 Archive Resilience sprints in Linear.

## Overview

Two automated scripts have been created to set up all sprints and assign issues:

- `create-sprints.sh` - Creates the 3 Linear cycles
- `assign-issues-to-sprints.sh` - Assigns all 9 issues to their sprints

## Prerequisites

You'll need your Linear API key to run these scripts:

1. Go to https://linear.app/settings/api
2. Click "New" to create an API key
3. Copy the key (keep it secret!)

## Step 1: Create the Sprints

```bash
export LINEAR_API_KEY="<your-api-key-here>"
bash .pac/create-sprints.sh
```

**What it does:**

- Creates 3 cycles in Linear for the Datamine team:
  - **Sprint 1**: Feb 1-14, 2026 (Bug Fixes & Foundation)
  - **Sprint 2**: Feb 17 - Mar 2, 2026 (Resilience Features)
  - **Sprint 3**: Mar 3-16, 2026 (Monitoring & Alerting)

**Expected output:**

```
Creating cycle: Sprint 1 - Bug Fixes & Foundation
  Start: 2026-02-01
  End:   2026-02-14
  ✅ Created with ID: cycle_abc123...

Creating cycle: Sprint 2 - Resilience Features
  Start: 2026-02-17
  End:   2026-03-02
  ✅ Created with ID: cycle_def456...

Creating cycle: Sprint 3 - Monitoring & Alerting
  Start: 2026-03-03
  End:   2026-03-16
  ✅ Created with ID: cycle_ghi789...
```

## Step 2: Assign Issues to Sprints

```bash
export LINEAR_API_KEY="<your-api-key-here>"
bash .pac/assign-issues-to-sprints.sh
```

**What it does:**

- Fetches the 3 sprints you just created
- Assigns all 9 issues to their correct sprints:
  - **Sprint 1**: DAT-32, DAT-29, DAT-31, DAT-37
  - **Sprint 2**: DAT-30, DAT-33, DAT-34
  - **Sprint 3**: DAT-35, DAT-36

**Expected output:**

```
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

✅ All issues assigned to sprints!
```

## Step 3: Verify in Linear

Go to https://linear.app/datamine/cycles to see your sprints with all issues assigned.

## Troubleshooting

### "LINEAR_API_KEY environment variable not set"

Make sure you export the key before running:

```bash
export LINEAR_API_KEY="lin_api_xxxxx..."
bash .pac/create-sprints.sh
```

### "Error creating cycle"

- Verify your API key is valid (hasn't expired)
- Check that you have permission to create cycles in the Datamine team
- Try creating a cycle manually in Linear first to ensure your account is authorized

### Issues not assigning

- Run `create-sprints.sh` first if you haven't already
- Verify the cycle IDs were created successfully
- Check that all issue IDs (DAT-29 through DAT-37) exist in Linear

## Manual Alternative

If the scripts don't work, you can create sprints manually in Linear:

1. Go to https://linear.app/datamine/cycles
2. Click "+ New Cycle"
3. Create each sprint with dates from SPRINT_PLAN.md
4. Open each issue and set its cycle in the right sidebar

See SPRINT_ASSIGNMENTS.md for the complete list of which issues go in each sprint.

## Security Note

- Never commit your LINEAR_API_KEY to git
- Use `unset LINEAR_API_KEY` after running the scripts
- If your key is exposed, regenerate it immediately at https://linear.app/settings/api
