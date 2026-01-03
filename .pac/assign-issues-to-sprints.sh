#!/bin/bash

################################################################################
# Assign Linear Issues to Archive Resilience Sprints
#
# This script takes the sprint IDs created by create-sprints.sh
# and assigns all 9 issues to their respective sprints.
#
# Usage:
#   export LINEAR_API_KEY="your-api-key-here"
#   bash .pac/assign-issues-to-sprints.sh
#
# The script will:
# 1. List the 3 most recent cycles (which should be your newly created sprints)
# 2. Extract their IDs automatically
# 3. Assign all 9 issues to the appropriate cycle
################################################################################

set -e

LINEAR_API_ENDPOINT="https://api.linear.app/graphql"
TEAM_ID="0c640fe8-9c50-4581-827b-cc0678dcde4a"  # Datamine (DAT) team

# Verify API key is set
if [ -z "$LINEAR_API_KEY" ]; then
  echo "Error: LINEAR_API_KEY environment variable not set"
  echo "Get your API key from: https://linear.app/settings/api"
  exit 1
fi

echo "==============================================="
echo "Fetching Cycle Information"
echo "==============================================="
echo ""

# Fetch all cycles for the team
cycles_response=$(curl -s "$LINEAR_API_ENDPOINT" \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "query": "query { cycles(filter: { team: { id: { eq: \"0c640fe8-9c50-4581-827b-cc0678dcde4a\" } } }, first: 10, orderBy: createdAt) { nodes { id name startsAt endsAt } } }"
}
EOF
)

# Check for errors
if echo "$cycles_response" | grep -q '"errors"'; then
  echo "Error fetching cycles:"
  echo "$cycles_response" | jq '.errors'
  exit 1
fi

# Extract cycle IDs and names (most recent 3)
echo "Found cycles:"
echo "$cycles_response" | jq -r '.data.cycles.nodes[] | "\(.name) (ID: \(.id))"' | tail -3

SPRINT1=$(echo "$cycles_response" | jq -r '.data.cycles.nodes[-3].id')
SPRINT2=$(echo "$cycles_response" | jq -r '.data.cycles.nodes[-2].id')
SPRINT3=$(echo "$cycles_response" | jq -r '.data.cycles.nodes[-1].id')

echo ""
echo "Sprint IDs:"
echo "  Sprint 1 (Bug Fixes): $SPRINT1"
echo "  Sprint 2 (Resilience): $SPRINT2"
echo "  Sprint 3 (Monitoring): $SPRINT3"
echo ""

# Helper function to assign issue to cycle
assign_issue_to_cycle() {
  local issue_id="$1"
  local cycle_id="$2"
  local sprint_name="$3"

  curl -s "$LINEAR_API_ENDPOINT" \
    -H "Authorization: Bearer $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d @- <<EOF > /dev/null
{
  "query": "mutation UpdateIssue(\$input: IssueUpdateInput!) { issueUpdate(id: \"$issue_id\", input: \$input) { success issue { identifier title } } }",
  "variables": {
    "input": {
      "cycleId": "$cycle_id"
    }
  }
}
EOF
  echo "  ✅ $issue_id → $sprint_name"
}

echo "==============================================="
echo "Assigning Issues to Sprints"
echo "==============================================="
echo ""

# Sprint 1: Bug Fixes & Foundation
echo "Sprint 1 (Bug Fixes & Foundation):"
assign_issue_to_cycle "DAT-32" "$SPRINT1" "Sprint 1"
assign_issue_to_cycle "DAT-29" "$SPRINT1" "Sprint 1"
assign_issue_to_cycle "DAT-31" "$SPRINT1" "Sprint 1"
assign_issue_to_cycle "DAT-37" "$SPRINT1" "Sprint 1"
echo ""

# Sprint 2: Resilience Features
echo "Sprint 2 (Resilience Features):"
assign_issue_to_cycle "DAT-30" "$SPRINT2" "Sprint 2"
assign_issue_to_cycle "DAT-33" "$SPRINT2" "Sprint 2"
assign_issue_to_cycle "DAT-34" "$SPRINT2" "Sprint 2"
echo ""

# Sprint 3: Monitoring & Alerting
echo "Sprint 3 (Monitoring & Alerting):"
assign_issue_to_cycle "DAT-35" "$SPRINT3" "Sprint 3"
assign_issue_to_cycle "DAT-36" "$SPRINT3" "Sprint 3"
echo ""

echo "==============================================="
echo "✅ All issues assigned to sprints!"
echo "==============================================="
echo ""
echo "Sprint Assignment Summary:"
echo "  Sprint 1: DAT-32, DAT-29, DAT-31, DAT-37 (4 issues, 19 sp)"
echo "  Sprint 2: DAT-30, DAT-33, DAT-34 (3 issues, 15 sp)"
echo "  Sprint 3: DAT-35, DAT-36 (2 issues, 13 sp)"
echo ""
echo "You can now view the sprints in Linear:"
echo "  https://linear.app/datamine/cycles"
echo ""
