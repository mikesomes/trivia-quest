#!/bin/bash
set -euo pipefail

URL="${GENERATE_QUESTIONS_URL:-}"
TOKEN="${CRON_SECRET:-${GENERATE_QUESTIONS_TOKEN:-}}"
RUNS=${1:-12}

if [ -z "$URL" ] || [ -z "$TOKEN" ]; then
  echo "Error: set GENERATE_QUESTIONS_URL and CRON_SECRET (or GENERATE_QUESTIONS_TOKEN)."
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

for i in $(seq 1 $RUNS); do
  echo "=== Run $i of $RUNS ==="

  echo "Generating easy questions..."
  curl -s -X POST "$URL" -H "$AUTH" -H "Content-Type: application/json" -d '{"category":"nfl_football","difficulty":"easy","count":15}'
  echo ""

  echo "Generating medium questions..."
  curl -s -X POST "$URL" -H "$AUTH" -H "Content-Type: application/json" -d '{"category":"nfl_football","difficulty":"medium","count":15}'
  echo ""

  echo "Generating hard questions..."
  curl -s -X POST "$URL" -H "$AUTH" -H "Content-Type: application/json" -d '{"category":"nfl_football","difficulty":"hard","count":15}'
  echo ""

  sleep 2
done

echo "=== Done ==="
