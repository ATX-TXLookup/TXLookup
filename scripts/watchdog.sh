#!/usr/bin/env bash
# watchdog.sh — keeps the deploy warm + detects stuck/down state
#
# What it does (one pass):
#   1. Pings https://txlookup.vercel.app/robots.txt — must return 200 or 401
#      (401 means basic-auth gate is up, which is fine)
#   2. Pings POST /api/agent?demo=1 with a marquee question — must end with
#      phase=done within 60s. Forces a cold start to thaw if the function
#      went idle.
#   3. Checks the latest GH Actions run on main — if it's been "in_progress"
#      > 15 minutes, prints a warning (we don't auto-cancel; humans decide)
#   4. Reports — exit 0 = healthy, exit 1 = degraded
#
# Usage:
#   ./scripts/watchdog.sh                              # default https://txlookup.vercel.app
#   ./scripts/watchdog.sh https://preview-xxx.vercel.app
#
#   # Run on a 5-min cron (locally or via GH Actions):
#   while true; do ./scripts/watchdog.sh; sleep 300; done

set -u

BASE_URL="${1:-https://txlookup.vercel.app}"
AUTH_ARGS=()
if [ -n "${TXLOOKUP_BASIC_AUTH:-}" ]; then
  AUTH_ARGS=(-u "$TXLOOKUP_BASIC_AUTH")
fi

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
ok=0
warn=0
fail=0

# Step 1 — liveness via robots.txt (always public)
http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/robots.txt" || echo "000")
case "$http_code" in
  200|401)
    echo "[$(ts)] LIVE  robots.txt → HTTP $http_code"
    ok=$((ok+1)) ;;
  *)
    echo "[$(ts)] DOWN  robots.txt → HTTP $http_code (expected 200 or 401)"
    fail=$((fail+1)) ;;
esac

# Step 2 — agent warm-up via demo fixture (cheap, deterministic)
agent_start=$(date +%s)
agent_out=$(curl -s -N --max-time 60 \
  -X POST "${BASE_URL}/api/agent?demo=1" \
  -H "Content-Type: application/json" \
  "${AUTH_ARGS[@]}" \
  -d '{"query":"Where do permits and code violations both spike together this year by zip?"}' 2>&1 || true)
agent_elapsed=$(( $(date +%s) - agent_start ))

if grep -q '"phase":"done"' <<<"$agent_out"; then
  echo "[$(ts)] WARM  /api/agent?demo=1 → done in ${agent_elapsed}s"
  ok=$((ok+1))
elif grep -q '"phase":"error"' <<<"$agent_out"; then
  err=$(grep -oE '"error":"[^"]*"' <<<"$agent_out" | head -1 | tr -d '"')
  echo "[$(ts)] FAIL  /api/agent?demo=1 → error: $err (${agent_elapsed}s)"
  fail=$((fail+1))
else
  echo "[$(ts)] FAIL  /api/agent?demo=1 → no done/error in ${agent_elapsed}s"
  fail=$((fail+1))
fi

# Step 3 — GH Actions stuckness check
if command -v gh >/dev/null 2>&1; then
  stuck_runs=$(gh run list --branch main --status in_progress --json createdAt,workflowName,databaseId 2>/dev/null \
    | python3 -c "
import json, sys, datetime as dt
runs = json.load(sys.stdin)
now = dt.datetime.now(dt.timezone.utc)
stuck = []
for r in runs:
    started = dt.datetime.fromisoformat(r['createdAt'].replace('Z','+00:00'))
    age_min = (now - started).total_seconds() / 60
    if age_min > 15:
        stuck.append(f\"{r['workflowName']}#{r['databaseId']} ({age_min:.0f}m)\")
print('\n'.join(stuck))
" 2>/dev/null || echo "")
  if [ -n "$stuck_runs" ]; then
    echo "[$(ts)] WARN  stuck GH Actions runs (>15min): $stuck_runs"
    warn=$((warn+1))
  else
    echo "[$(ts)] OK    no stuck GH Actions runs"
    ok=$((ok+1))
  fi
fi

echo ""
echo "[$(ts)] SUMMARY  ok=$ok warn=$warn fail=$fail"

if [ "$fail" -gt 0 ]; then
  exit 1
elif [ "$warn" -gt 0 ]; then
  exit 2
else
  exit 0
fi
