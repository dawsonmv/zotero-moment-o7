#!/bin/bash

# Create a new PAC Epic
# Usage: ./new-epic.sh [slug] [name]

set -e

PAC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EPICS_DIR="$PAC_DIR/epics"
TEMPLATE="$PAC_DIR/templates/epic-template.yaml"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

# Timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Validate template exists
if [ ! -f "$TEMPLATE" ]; then
  echo "Error: Template not found at $TEMPLATE"
  exit 1
fi

# Function to convert title to slug
to_slug() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/-$//'
}

# Interactive mode if no arguments
if [ $# -eq 0 ]; then
  echo -e "${BLUE}Create a new Epic${NC}\n"

  read -p "Epic slug (lowercase, hyphenated): " slug
  if [ -z "$slug" ]; then
    echo "Error: Slug is required"
    exit 1
  fi

  read -p "Epic name: " name
  if [ -z "$name" ]; then
    echo "Error: Name is required"
    exit 1
  fi

  read -p "Description: " description

  read -p "Owner (default: Dawson Valdes): " owner
  owner=${owner:-"Dawson Valdes"}

  read -p "Target completion date (YYYY-MM-DD, optional): " target_date

  # Generate success criteria
  echo "Enter success criteria (one per line, empty line to finish):"
  criteria=()
  while true; do
    read -p "  - " criterion
    if [ -z "$criterion" ]; then
      break
    fi
    criteria+=("$criterion")
  done
else
  # Arguments mode
  slug="$1"
  name="${2:-$slug}"
  description="${3:-}"
  owner="${4:-Dawson Valdes}"
  target_date="${5:-}"
fi

# Validate slug format
if ! [[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: Slug must contain only lowercase letters, numbers, and hyphens"
  exit 1
fi

# Create output filename
output_file="$EPICS_DIR/epic-${slug}.yaml"

# Check if already exists
if [ -f "$output_file" ]; then
  echo "Error: Epic already exists at $output_file"
  exit 1
fi

# Create the epic file
cat > "$output_file" << EOF
apiVersion: productascode.org/v0.1.0
kind: Epic
metadata:
  id: "EPIC-${slug}"
  name: "${name}"
  created: "${TIMESTAMP}"
  updated: "${TIMESTAMP}"
  owner: "${owner}"
  status: "planned"

spec:
  description: |
    ${description}

  goals: |
    [Define the strategic goals this epic achieves]

  scope: |
    [What is included in this epic?
     What is explicitly NOT included?]

  success_criteria:
EOF

# Add success criteria if provided
if [ ${#criteria[@]} -gt 0 ]; then
  for criterion in "${criteria[@]}"; do
    echo "    - \"${criterion}\"" >> "$output_file"
  done
else
  cat >> "$output_file" << EOF
    - "[Criterion 1]"
    - "[Criterion 2]"
    - "[Criterion 3]"
EOF
fi

# Add timeline section
cat >> "$output_file" << EOF

  timeline:
    start_date: "$(date -u +"%Y-%m-%d")"
EOF

if [ -n "$target_date" ]; then
  echo "    target_completion: \"${target_date}\"" >> "$output_file"
else
  echo "    target_completion: \"[YYYY-MM-DD]\"" >> "$output_file"
fi

cat >> "$output_file" << EOF
    estimated_effort: "[e.g., 8 weeks, 40 story points]"

  dependencies: []
    # epic_id: "[If dependent on another epic]"
    # type: "blocks|blocked_by|related_to"

  tickets: []
    # Tickets linked to this epic will be listed here

  acceptance_criteria:
    - "[ ] All tickets marked as done"
    - "[ ] Code review completed"
    - "[ ] Testing passed"

  metrics: []
    # - name: "[Metric Name]"
    #   description: "[How will success be measured?]"
    #   target: "[Target value or threshold]"

  notes: |
    [Any additional context, assumptions, or risks]
EOF

echo -e "${GREEN}✓${NC} Created epic at: ${output_file}"
echo ""
echo "Next steps:"
echo "  1. Edit the epic file to add details"
echo "  2. Create related tickets: .pac/scripts/new-ticket.sh"
echo "  3. Validate: .pac/scripts/validate.sh"
echo "  4. Commit and create PR"
