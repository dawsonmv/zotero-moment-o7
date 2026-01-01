#!/bin/bash

# Create a new PAC Ticket
# Usage: ./new-ticket.sh [slug] [epic-id] [type] [priority]

set -e

PAC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TICKETS_DIR="$PAC_DIR/tickets"
TEMPLATE="$PAC_DIR/templates/ticket-template.yaml"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Validate template exists
if [ ! -f "$TEMPLATE" ]; then
  echo "Error: Template not found at $TEMPLATE"
  exit 1
fi

# Available types and priorities
TYPES=("feature" "bug" "enhancement" "refactor" "docs" "test")
PRIORITIES=("critical" "high" "medium" "low")

# Function to convert title to slug
to_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/-$//'
}

# Function to show menu
show_menu() {
  local array=("$@")
  local count=1
  for item in "${array[@]}"; do
    echo "  $count) $item"
    ((count++))
  done
}

# Function to get menu selection
get_selection() {
  local prompt="$1"
  shift
  local array=("$@")
  local max=${#array[@]}

  while true; do
    read -p "$prompt" selection
    if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le "$max" ]; then
      echo "${array[$((selection-1))]}"
      return 0
    fi
    echo "Invalid selection. Please enter a number between 1 and $max."
  done
}

# Interactive mode if no arguments
if [ $# -eq 0 ]; then
  echo -e "${BLUE}Create a new Ticket${NC}\n"

  read -p "Ticket slug (lowercase, hyphenated): " slug
  if [ -z "$slug" ]; then
    echo "Error: Slug is required"
    exit 1
  fi

  read -p "Ticket name: " name
  if [ -z "$name" ]; then
    echo "Error: Name is required"
    exit 1
  fi

  read -p "Epic ID (e.g., EPIC-feature-name): " epic_id
  if [ -z "$epic_id" ]; then
    echo "Error: Epic ID is required"
    exit 1
  fi

  # Validate epic exists
  epic_slug=$(echo "$epic_id" | tr '[:upper:]' '[:lower:]' | sed 's/epic-//')
  if ! ls "$PAC_DIR/epics/epic-${epic_slug}.yaml" 2>/dev/null | grep -q .; then
    echo -e "${RED}✗${NC} Epic not found: $epic_id"
    echo "Available epics:"
    ls -1 "$PAC_DIR/epics"/ 2>/dev/null | sed 's/epic-/EPIC-/' | sed 's/.yaml//' || echo "  (none)"
    exit 1
  fi

  echo -e "\nSelect ticket type:"
  show_menu "${TYPES[@]}"
  type=$(get_selection "Choose type (1-${#TYPES[@]}): " "${TYPES[@]}")

  echo -e "\nSelect priority:"
  show_menu "${PRIORITIES[@]}"
  priority=$(get_selection "Choose priority (1-${#PRIORITIES[@]}): " "${PRIORITIES[@]}")

  read -p "Assignee (default: Dawson Valdes): " assignee
  assignee=${assignee:-"Dawson Valdes"}

  read -p "Description: " description

  # Generate acceptance criteria
  echo "Enter acceptance criteria (one per line, empty line to finish):"
  criteria=()
  while true; do
    read -p "  - [ ] " criterion
    if [ -z "$criterion" ]; then
      break
    fi
    criteria+=("$criterion")
  done
else
  # Arguments mode
  slug="$1"
  epic_id="${2:-}"
  type="${3:-feature}"
  priority="${4:-medium}"
  name="${5:-$slug}"
  assignee="${6:-Dawson Valdes}"
  description=""
fi

# Validate slug format
if ! [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: Slug must contain only lowercase letters, numbers, and hyphens"
  exit 1
fi

# Validate type
if ! [[ " ${TYPES[@]} " =~ " ${type} " ]]; then
  echo "Error: Invalid type. Must be one of: ${TYPES[*]}"
  exit 1
fi

# Validate priority
if ! [[ " ${PRIORITIES[@]} " =~ " ${priority} " ]]; then
  echo "Error: Invalid priority. Must be one of: ${PRIORITIES[*]}"
  exit 1
fi

# Create output filename
output_file="$TICKETS_DIR/ticket-${slug}.yaml"

# Check if already exists
if [ -f "$output_file" ]; then
  echo "Error: Ticket already exists at $output_file"
  exit 1
fi

# Create the ticket file
cat > "$output_file" << EOF
apiVersion: productascode.org/v0.1.0
kind: Ticket
metadata:
  id: "TICKET-${slug}"
  name: "${name}"
  epic_id: "${epic_id}"
  created: "${TIMESTAMP}"
  updated: "${TIMESTAMP}"
  assignee: "${assignee}"
  type: "${type}"
  status: "backlog"
  priority: "${priority}"

spec:
  description: |
    ${description:-[Provide a clear description of the ticket.
     What needs to be done? Why?]}

  problem_statement: |
    [Why is this ticket needed?]

  acceptance_criteria:
EOF

# Add acceptance criteria if provided
if [ ${#criteria[@]} -gt 0 ]; then
  for criterion in "${criteria[@]}"; do
    echo "    - \"[ ] ${criterion}\"" >> "$output_file"
  done
  echo "    - \"[ ] Code reviewed and approved\"" >> "$output_file"
  echo "    - \"[ ] Tests pass\"" >> "$output_file"
else
  cat >> "$output_file" << EOF
    - "[ ] Acceptance criterion 1"
    - "[ ] Acceptance criterion 2"
    - "[ ] Code reviewed and approved"
    - "[ ] Tests pass"
EOF
fi

cat >> "$output_file" << EOF

  implementation_details:
    approach: |
      [How will this be implemented?
       What is the technical approach?]

    affected_files:
      - "src/module/file.ts"
      - "tests/module/file.test.ts"

    dependencies: []
      # - library: "[Library Name]"
      #   version: "[Version]"
      #   reason: "[Why needed?]"

  testing_strategy: |
    [How will this be tested?
     What test scenarios need coverage?]

  tasks:
    - "[ ] Task 1"
    - "[ ] Task 2"

  blockers: []

  related_tickets: []

  estimated_effort: "[e.g., 3 story points, 1-2 days]"

  labels:
    - "component"

  performance_considerations: |
    [Any performance concerns?]

  security_considerations: |
    [Any security concerns?]

  documentation_required:
    - "[ ] Code comments for complex logic"
    - "[ ] README updates"
    - "[ ] CHANGELOG entry"

  notes: |
    [Additional context or implementation notes]

  checklist:
    - "[ ] Implementation complete"
    - "[ ] Unit tests written"
    - "[ ] Integration tests pass"
    - "[ ] Code review completed"
    - "[ ] Documentation updated"
    - "[ ] Ready for merge"
EOF

echo -e "${GREEN}✓${NC} Created ticket at: ${output_file}"
echo ""
echo "Next steps:"
echo "  1. Edit the ticket file to add details"
echo "  2. Create related tickets: .pac/scripts/new-ticket.sh"
echo "  3. Validate: .pac/scripts/validate.sh"
echo "  4. Commit and create PR"
