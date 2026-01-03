#!/bin/bash

################################################################################
# Create Linear Cycles for Archive Resilience Epic
#
# Usage:
#   export LINEAR_API_KEY="your-api-key-here"
#   bash .pac/create-sprints.sh
#
# Get your Linear API key from: https://linear.app/settings/api
################################################################################

set -e

# Configuration
TEAM_ID="0c640fe8-9c50-4581-827b-cc0678dcde4a"  # Datamine (DAT) team
LINEAR_API_ENDPOINT="https://api.linear.app/graphql"

# Verify API key is set
if [ -z "$LINEAR_API_KEY" ]; then
  echo "Error: LINEAR_API_KEY environment variable not set"
  echo "Get your API key from: https://linear.app/settings/api"
  exit 1
fi

# Helper function to create a cycle
create_cycle() {
  local name="$1"
  local start_date="$2"
  local end_date="$3"

  echo "Creating cycle: $name"
  echo "  Start: $start_date"
  echo "  End:   $end_date"

  local response=$(curl -s "$LINEAR_API_ENDPOINT" \
    -H "Authorization: Bearer $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d @- <<EOF
{
  "query": "mutation CreateCycle(\$input: CycleCreateInput!) { cycleCreate(input: \$input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "$TEAM_ID",
      "name": "$name",
      "startsAt": "$start_date",
      "endsAt": "$end_date"
    }
  }
}
EOF
)

  # Check for errors
  if echo "$response" | grep -q '"errors"'; then
    echo "Error creating cycle:"
    echo "$response" | jq '.errors'
    return 1
  fi

  local cycle_id=$(echo "$response" | jq -r '.data.cycleCreate.cycle.id')
  echo "  ✅ Created with ID: $cycle_id"
  echo ""
  echo "$cycle_id"
}

echo "==============================================="
echo "Creating Archive Resilience Sprints"
echo "==============================================="
echo ""

# Create Sprint 1: Bug Fixes & Foundation
echo "Sprint 1: Bug Fixes & Foundation"
echo "Issues: DAT-32, DAT-29, DAT-31, DAT-37"
SPRINT1_ID=$(create_cycle \
  "Sprint 1 - Bug Fixes & Foundation" \
  "2026-02-01" \
  "2026-02-14")

# Create Sprint 2: Resilience Features
echo "Sprint 2: Resilience Features"
echo "Issues: DAT-30, DAT-33, DAT-34, (DAT-37 completion)"
SPRINT2_ID=$(create_cycle \
  "Sprint 2 - Resilience Features" \
  "2026-02-17" \
  "2026-03-02")

# Create Sprint 3: Monitoring & Alerting
echo "Sprint 3: Monitoring & Alerting"
echo "Issues: DAT-35, DAT-36"
SPRINT3_ID=$(create_cycle \
  "Sprint 3 - Monitoring & Alerting" \
  "2026-03-03" \
  "2026-03-16")

echo "==============================================="
echo "✅ All 3 sprints created successfully!"
echo "==============================================="
echo ""
echo "Sprint IDs (for reference):"
echo "  Sprint 1: $SPRINT1_ID"
echo "  Sprint 2: $SPRINT2_ID"
echo "  Sprint 3: $SPRINT3_ID"
echo ""
echo "Next step: Assign issues to cycles using:"
echo "  bash .pac/assign-issues-to-sprints.sh"
echo ""
