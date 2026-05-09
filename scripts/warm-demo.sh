#!/usr/bin/env bash
# warm-demo.sh — pre-fire the 4 marquee demo questions against /api/agent
# so the Vercel function, Socrata responses, and OpenAI cold-start are warm
# before the live stage demo. Run ~30-60s before recording or going on stage.
#
# Usage:
#   ./scripts/warm-demo.sh                                # default http://localhost:3000
#   ./scripts/warm-demo.sh https://txlookup.vercel.app    # against prod
#
#   # If the basic-auth gate is on:
#   TXLOOKUP_BASIC_AUTH=txlookup:aitx2026 \
#     ./scripts/warm-demo.sh https://txlookup.vercel.app
#
# Exit codes: 0 = all queries reached "done"; 1 = at least one stalled or errored.

set -u

BASE_URL="${1:-http://localhost:3000}"

AUTH_ARGS=()
if [ -n "${TXLOOKUP_BASIC_AUTH:-}" ]; then
  AUTH_ARGS=(-u "$TXLOOKUP_BASIC_AUTH")
fi

# Marquee questions — keep in sync with app/page.tsx `sampleQuestions[]`.
# These are the 4 the demo script and home-page chips both reference.
QUERIES=(
  "Restaurants near 78704 with failing inspections this year"
  "Food truck permits issued in 78702 in the last six months"
  "311 response times across all 10 council districts"
  "Where are construction permits growing fastest by zip?"
)

echo "Pre-warming ${#QUERIES[@]} marquee questions against ${BASE_URL}"
echo "(Streaming SSE until 'done' or 'error' — ~5-30s per query)"
echo ""

failed=0
total_start=$(date +%s)

for q in "${QUERIES[@]}"; do
  # None of the marquee strings contain a quote or backslash, so simple
  # JSON construction is safe. If that ever stops being true, swap for jq.
  payload=$(printf '{"query":"%s"}' "$q")
  start=$(date +%s)

  out=$(curl -s -N -X POST "${BASE_URL}/api/agent" \
    -H "Content-Type: application/json" \
    --max-time 60 \
    "${AUTH_ARGS[@]}" \
    -d "$payload" 2>&1) || true

  elapsed=$(( $(date +%s) - start ))

  if grep -q '"phase":"done"' <<<"$out"; then
    echo "  ✓ [${elapsed}s] $q"
  elif grep -q '"phase":"error"' <<<"$out"; then
    err=$(grep -oE '"error":"[^"]*"' <<<"$out" | head -1)
    echo "  ✗ [${elapsed}s] $q  →  $err"
    failed=$((failed + 1))
  else
    echo "  ? [${elapsed}s] $q  →  no done/error event (timeout or auth gate?)"
    failed=$((failed + 1))
  fi
done

total=$(( $(date +%s) - total_start ))
echo ""
if [ "$failed" -eq 0 ]; then
  echo "All ${#QUERIES[@]} queries warm in ${total}s. Cache hot for the next ~60s."
  exit 0
else
  echo "WARN: ${failed} of ${#QUERIES[@]} queries did not complete cleanly."
  echo "      If hitting prod with the basic-auth gate, set TXLOOKUP_BASIC_AUTH=user:pass."
  exit 1
fi
