#!/usr/bin/env bash
# Generates ~600 NFL questions across easy/medium/hard (5 batches × 50 × 3 difficulties).
# Duplicate detection is handled server-side via content_hash — safe to run multiple times.
#
# Usage: bash scripts/generate-nfl-questions.sh

set -euo pipefail

# Load env
ENV_FILE="$(dirname "$0")/../.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  exit 1
fi

export $(grep -v '^#' "$ENV_FILE" | xargs)

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  exit 1
fi

ENDPOINT="${SUPABASE_URL}/functions/v1/generate-questions"
CATEGORY="nfl_football"
BATCHES=5
COUNT=50
TOTAL_GENERATED=0

echo "Generating NFL questions: ${BATCHES} batches × ${COUNT} questions × 3 difficulties"
echo "Endpoint: $ENDPOINT"
echo ""

for DIFFICULTY in easy medium hard; do
  DIFF_TOTAL=0
  echo "── $DIFFICULTY ──────────────────────────"

  for BATCH in $(seq 1 $BATCHES); do
    printf "  Batch %d/%d ... " "$BATCH" "$BATCHES"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"category\":\"$CATEGORY\",\"difficulty\":\"$DIFFICULTY\",\"count\":$COUNT}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if [ "$HTTP_CODE" = "200" ]; then
      # Extract generated count from JSON without requiring jq
      GENERATED=$(echo "$BODY" | grep -o '"generated":[0-9]*' | grep -o '[0-9]*')
      echo "✓ ${GENERATED:-?} questions added"
      DIFF_TOTAL=$((DIFF_TOTAL + ${GENERATED:-0}))
      TOTAL_GENERATED=$((TOTAL_GENERATED + ${GENERATED:-0}))
    else
      echo "✗ HTTP $HTTP_CODE — $BODY"
    fi

    # Brief pause between batches to avoid rate limiting
    if [ "$BATCH" -lt "$BATCHES" ]; then
      sleep 3
    fi
  done

  echo "  Subtotal: $DIFF_TOTAL questions"
  echo ""

  # Pause between difficulties
  if [ "$DIFFICULTY" != "hard" ]; then
    sleep 5
  fi
done

echo "══════════════════════════════════════"
echo "Total questions added: $TOTAL_GENERATED"
echo "(Duplicates were silently skipped by the server)"
