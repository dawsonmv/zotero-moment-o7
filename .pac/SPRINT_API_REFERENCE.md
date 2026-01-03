# Linear API Reference for Sprint Creation

This document provides the exact GraphQL queries and mutations used to create sprints and assign issues. Use this for API troubleshooting or manual execution if needed.

---

## Authentication

All requests require the LINEAR_API_KEY header:

```
Authorization: Bearer lin_xxxxxxxxxxxxxxxx
Content-Type: application/json
```

---

## Cycle Creation Queries

### 1. Create Sprint 1: Bug Fixes & Foundation

**Endpoint**: POST https://api.linear.app/graphql

**Request Body**:
```json
{
  "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
      "name": "Sprint 1 - Bug Fixes & Foundation",
      "startsAt": "2026-02-01",
      "endsAt": "2026-02-14"
    }
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "cycleCreate": {
      "success": true,
      "cycle": {
        "id": "cycle_abc123...",
        "name": "Sprint 1 - Bug Fixes & Foundation"
      }
    }
  }
}
```

**Using cURL**:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
    "variables": {
      "input": {
        "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
        "name": "Sprint 1 - Bug Fixes & Foundation",
        "startsAt": "2026-02-01",
        "endsAt": "2026-02-14"
      }
    }
  }'
```

---

### 2. Create Sprint 2: Resilience Features

**Request Body**:
```json
{
  "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
      "name": "Sprint 2 - Resilience Features",
      "startsAt": "2026-02-17",
      "endsAt": "2026-03-02"
    }
  }
}
```

**Using cURL**:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
    "variables": {
      "input": {
        "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
        "name": "Sprint 2 - Resilience Features",
        "startsAt": "2026-02-17",
        "endsAt": "2026-03-02"
      }
    }
  }'
```

---

### 3. Create Sprint 3: Monitoring & Alerting

**Request Body**:
```json
{
  "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
      "name": "Sprint 3 - Monitoring & Alerting",
      "startsAt": "2026-03-03",
      "endsAt": "2026-03-16"
    }
  }
}
```

**Using cURL**:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
    "variables": {
      "input": {
        "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
        "name": "Sprint 3 - Monitoring & Alerting",
        "startsAt": "2026-03-03",
        "endsAt": "2026-03-16"
      }
    }
  }'
```

---

## Fetch Cycles Query

To get the cycle IDs after creation (useful for debugging):

**Request Body**:
```json
{
  "query": "query { cycles(filter: { team: { id: { eq: \"0c640fe8-9c50-4581-827b-cc0678dcde4a\" } } }, first: 10, orderBy: createdAt) { nodes { id name startsAt endsAt } } }"
}
```

**Expected Response**:
```json
{
  "data": {
    "cycles": {
      "nodes": [
        {
          "id": "cycle_abc123...",
          "name": "Sprint 1 - Bug Fixes & Foundation",
          "startsAt": "2026-02-01T00:00:00Z",
          "endsAt": "2026-02-14T23:59:59Z"
        },
        {
          "id": "cycle_def456...",
          "name": "Sprint 2 - Resilience Features",
          "startsAt": "2026-02-17T00:00:00Z",
          "endsAt": "2026-03-02T23:59:59Z"
        },
        {
          "id": "cycle_ghi789...",
          "name": "Sprint 3 - Monitoring & Alerting",
          "startsAt": "2026-03-03T00:00:00Z",
          "endsAt": "2026-03-16T23:59:59Z"
        }
      ]
    }
  }
}
```

**Using cURL**:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { cycles(filter: { team: { id: { eq: \"0c640fe8-9c50-4581-827b-cc0678dcde4a\" } } }, first: 10, orderBy: createdAt) { nodes { id name startsAt endsAt } } }"
  }'
```

---

## Issue Assignment Mutations

### Sprint 1 Assignments

#### DAT-32 → Sprint 1

**Request**:
```json
{
  "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-32\", input: $input) { success issue { identifier title } } }",
  "variables": {
    "input": {
      "cycleId": "cycle_abc123..."
    }
  }
}
```

**Using cURL**:
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-32\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_abc123..."
      }
    }
  }'
```

#### DAT-29 → Sprint 1
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-29\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_abc123..."
      }
    }
  }'
```

#### DAT-31 → Sprint 1
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-31\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_abc123..."
      }
    }
  }'
```

#### DAT-37 → Sprint 1
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-37\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_abc123..."
      }
    }
  }'
```

---

### Sprint 2 Assignments

#### DAT-30 → Sprint 2
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-30\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_def456..."
      }
    }
  }'
```

#### DAT-33 → Sprint 2
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-33\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_def456..."
      }
    }
  }'
```

#### DAT-34 → Sprint 2
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-34\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_def456..."
      }
    }
  }'
```

---

### Sprint 3 Assignments

#### DAT-35 → Sprint 3
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-35\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_ghi789..."
      }
    }
  }'
```

#### DAT-36 → Sprint 3
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation UpdateIssue($input: IssueUpdateInput!) { issueUpdate(id: \"DAT-36\", input: $input) { success issue { identifier title } } }",
    "variables": {
      "input": {
        "cycleId": "cycle_ghi789..."
      }
    }
  }'
```

---

## Error Handling

### Authentication Error

**Request** (with invalid key):
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Response**:
```json
{
  "errors": [
    {
      "message": "Unauthorized"
    }
  ]
}
```

**Solution**: Verify LINEAR_API_KEY is correct

---

### Rate Limiting

**Response** (HTTP 429):
```json
{
  "errors": [
    {
      "message": "Too Many Requests",
      "extensions": {
        "retryAfter": 60
      }
    }
  ]
}
```

**Solution**: Wait 60 seconds before retrying

---

### Invalid Team ID

**Request**:
```json
{
  "variables": {
    "input": {
      "teamId": "invalid-team-id",
      ...
    }
  }
}
```

**Response**:
```json
{
  "errors": [
    {
      "message": "Team not found"
    }
  ]
}
```

**Solution**: Use correct team ID: 0c640fe8-9c50-4581-827b-cc0678dcde4a

---

## Complete Example: Full Execution Flow

Here's a complete shell script that demonstrates the full flow:

```bash
#!/bin/bash
set -e

API_KEY="$LINEAR_API_KEY"
TEAM_ID="0c640fe8-9c50-4581-827b-cc0678dcde4a"
ENDPOINT="https://api.linear.app/graphql"

# Verify API key
if [ -z "$API_KEY" ]; then
  echo "Error: LINEAR_API_KEY not set"
  exit 1
fi

echo "Step 1: Create Sprint 1"
S1=$(curl -s "$ENDPOINT" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF' | jq -r '.data.cycleCreate.cycle.id'
{
  "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
      "name": "Sprint 1 - Bug Fixes & Foundation",
      "startsAt": "2026-02-01",
      "endsAt": "2026-02-14"
    }
  }
}
EOF
)
echo "Created Sprint 1: $S1"

echo ""
echo "Step 2: Create Sprint 2"
S2=$(curl -s "$ENDPOINT" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF' | jq -r '.data.cycleCreate.cycle.id'
{
  "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
      "name": "Sprint 2 - Resilience Features",
      "startsAt": "2026-02-17",
      "endsAt": "2026-03-02"
    }
  }
}
EOF
)
echo "Created Sprint 2: $S2"

echo ""
echo "Step 3: Create Sprint 3"
S3=$(curl -s "$ENDPOINT" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF' | jq -r '.data.cycleCreate.cycle.id'
{
  "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
  "variables": {
    "input": {
      "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
      "name": "Sprint 3 - Monitoring & Alerting",
      "startsAt": "2026-03-03",
      "endsAt": "2026-03-16"
    }
  }
}
EOF
)
echo "Created Sprint 3: $S3"

echo ""
echo "Step 4: Assign Sprint 1 Issues"
for ISSUE in DAT-32 DAT-29 DAT-31 DAT-37; do
  curl -s "$ENDPOINT" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @- <<EOF > /dev/null
{
  "query": "mutation UpdateIssue(\$input: IssueUpdateInput!) { issueUpdate(id: \"$ISSUE\", input: \$input) { success issue { identifier } } }",
  "variables": {
    "input": {
      "cycleId": "$S1"
    }
  }
}
EOF
  echo "Assigned $ISSUE to Sprint 1"
done

echo ""
echo "Step 5: Assign Sprint 2 Issues"
for ISSUE in DAT-30 DAT-33 DAT-34; do
  curl -s "$ENDPOINT" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @- <<EOF > /dev/null
{
  "query": "mutation UpdateIssue(\$input: IssueUpdateInput!) { issueUpdate(id: \"$ISSUE\", input: \$input) { success issue { identifier } } }",
  "variables": {
    "input": {
      "cycleId": "$S2"
    }
  }
}
EOF
  echo "Assigned $ISSUE to Sprint 2"
done

echo ""
echo "Step 6: Assign Sprint 3 Issues"
for ISSUE in DAT-35 DAT-36; do
  curl -s "$ENDPOINT" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d @- <<EOF > /dev/null
{
  "query": "mutation UpdateIssue(\$input: IssueUpdateInput!) { issueUpdate(id: \"$ISSUE\", input: \$input) { success issue { identifier } } }",
  "variables": {
    "input": {
      "cycleId": "$S3"
    }
  }
}
EOF
  echo "Assigned $ISSUE to Sprint 3"
done

echo ""
echo "Done! All sprints created and issues assigned."
```

---

## Testing Individual Calls

To test a single call manually:

```bash
# 1. Set API key
export LINEAR_API_KEY="lin_your_key_here"

# 2. Test authentication
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name } }"}'

# 3. Create a single cycle
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: Bearer $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateCycle($input: CycleCreateInput!) { cycleCreate(input: $input) { success cycle { id name } } }",
    "variables": {
      "input": {
        "teamId": "0c640fe8-9c50-4581-827b-cc0678dcde4a",
        "name": "Test Sprint",
        "startsAt": "2026-02-01",
        "endsAt": "2026-02-14"
      }
    }
  }' | jq '.'
```

---

## References

- [Linear API Documentation](https://developers.linear.app/)
- [Linear API Explorer](https://studio.apollographql.com/sandbox/explorer)
- [GraphQL Specification](https://graphql.org/)

---

**Last Updated**: 2026-01-02
**Status**: Ready for Reference
**Usage**: Debugging, manual execution, API testing
