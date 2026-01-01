#!/bin/bash

# PAC Validation Script
# Validates the structure and content of PAC (Product as Code) configuration files

set -e

PAC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EPICS_DIR="$PAC_DIR/epics"
TICKETS_DIR="$PAC_DIR/tickets"
CONFIG_FILE="$PAC_DIR/pac.config.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESSES=0

# Functions
log_error() {
  echo -e "${RED}✗ ERROR${NC}: $1"
  ((ERRORS++))
}

log_warning() {
  echo -e "${YELLOW}⚠ WARNING${NC}: $1"
  ((WARNINGS++))
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
  ((SUCCESSES++))
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

validate_yaml() {
  local file=$1
  if ! command -v yq &> /dev/null; then
    log_warning "yq not found - skipping YAML validation for $file"
    return
  fi

  if ! yq eval '.' "$file" > /dev/null 2>&1; then
    log_error "Invalid YAML syntax in $file"
  fi
}

validate_file_exists() {
  local file=$1
  if [ ! -f "$file" ]; then
    log_error "Required file not found: $file"
    return 1
  fi
  return 0
}

validate_required_field() {
  local file=$1
  local field=$2

  if ! command -v yq &> /dev/null; then
    return
  fi

  if ! yq eval ".$field" "$file" > /dev/null 2>&1; then
    log_error "Missing required field '$field' in $file"
  fi
}

validate_unique_ids() {
  log_info "Checking for unique IDs..."

  local ids=()
  local duplicates=0

  # Check epics
  if [ -d "$EPICS_DIR" ]; then
    for epic_file in "$EPICS_DIR"/*.yaml; do
      if [ -f "$epic_file" ]; then
        local id=$(grep -E "^\s+id:" "$epic_file" | head -1 | awk -F'"' '{print $2}' | awk -F"'" '{print $2}')
        if [ -z "$id" ]; then
          id=$(grep -E "^\s+id:" "$epic_file" | head -1 | sed 's/.*id: *//' | sed 's/[" '"'"']//g')
        fi

        if [[ " ${ids[@]} " =~ " ${id} " ]]; then
          log_error "Duplicate epic ID found: $id"
          ((duplicates++))
        else
          ids+=("$id")
        fi
      fi
    done
  fi

  # Check tickets
  if [ -d "$TICKETS_DIR" ]; then
    for ticket_file in "$TICKETS_DIR"/*.yaml; do
      if [ -f "$ticket_file" ]; then
        local id=$(grep -E "^\s+id:" "$ticket_file" | head -1 | awk -F'"' '{print $2}' | awk -F"'" '{print $2}')
        if [ -z "$id" ]; then
          id=$(grep -E "^\s+id:" "$ticket_file" | head -1 | sed 's/.*id: *//' | sed 's/[" '"'"']//g')
        fi

        if [[ " ${ids[@]} " =~ " ${id} " ]]; then
          log_error "Duplicate ticket ID found: $id"
          ((duplicates++))
        else
          ids+=("$id")
        fi
      fi
    done
  fi

  if [ $duplicates -eq 0 ]; then
    log_success "No duplicate IDs found"
  fi
}

validate_epic_ticket_links() {
  log_info "Checking epic-ticket relationships..."

  if ! command -v yq &> /dev/null; then
    log_warning "yq not found - skipping epic-ticket relationship validation"
    return
  fi

  local broken_links=0

  if [ -d "$TICKETS_DIR" ]; then
    for ticket_file in "$TICKETS_DIR"/*.yaml; do
      if [ -f "$ticket_file" ]; then
        local epic_id=$(yq eval '.metadata.epic_id // .metadata.epic' "$ticket_file" 2>/dev/null || echo "")

        if [ -n "$epic_id" ] && [ "$epic_id" != "null" ] && [ "$epic_id" != "" ]; then
          local epic_file="$EPICS_DIR/$(echo "$epic_id" | tr '[:upper:]' '[:lower:]' | sed 's/epic-//')*.yaml"
          if ! ls $epic_file 2>/dev/null | grep -q .; then
            log_error "Ticket references non-existent epic: $epic_id (in $(basename "$ticket_file"))"
            ((broken_links++))
          fi
        fi
      fi
    done
  fi

  if [ $broken_links -eq 0 ]; then
    log_success "All epic-ticket relationships are valid"
  fi
}

# Main validation
main() {
  echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}     PAC (Product as Code) Validation Report${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"

  # Check PAC directory structure
  log_info "Validating PAC directory structure..."

  if validate_file_exists "$CONFIG_FILE"; then
    log_success "Found .pac/pac.config.yaml"
    validate_yaml "$CONFIG_FILE"
  fi

  [ -d "$EPICS_DIR" ] && log_success "Found .pac/epics/ directory" || log_warning "Missing .pac/epics/ directory"
  [ -d "$TICKETS_DIR" ] && log_success "Found .pac/tickets/ directory" || log_warning "Missing .pac/tickets/ directory"

  # Validate YAML files
  echo ""
  log_info "Validating YAML syntax..."

  if [ -d "$EPICS_DIR" ]; then
    for epic_file in "$EPICS_DIR"/*.yaml; do
      [ -f "$epic_file" ] && validate_yaml "$epic_file"
    done
  fi

  if [ -d "$TICKETS_DIR" ]; then
    for ticket_file in "$TICKETS_DIR"/*.yaml; do
      [ -f "$ticket_file" ] && validate_yaml "$ticket_file"
    done
  fi

  # Check unique IDs
  echo ""
  validate_unique_ids

  # Check epic-ticket links
  echo ""
  validate_epic_ticket_links

  # Summary
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}                    Summary${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
  echo -e "Successes: ${GREEN}${SUCCESSES}${NC}"
  echo -e "Warnings:  ${YELLOW}${WARNINGS}${NC}"
  echo -e "Errors:    ${RED}${ERRORS}${NC}"
  echo ""

  if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Validation passed!${NC}"
    return 0
  else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    return 1
  fi
}

main "$@"
