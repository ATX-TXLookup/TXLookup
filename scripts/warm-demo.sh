#!/usr/bin/env bash
# Pre-warm the live agent + Socrata caches before going on stage.
# Run this 30s-60s before recording the demo or starting the live judging session.
#
# Hits each marquee question through /api/agent (so OpenAI + Socrata + cache
# layers all wake up) and checks each response is well-formed.
#
# Usage:
#   bash scripts/warm-demo.sh                      # production (txlookup.vercel.app)
#   bash scripts/warm-demo.sh https://my-preview   # preview deployment
#
# If the site is basic-auth gated, set TXLOOKUP_BASIC_AUTH=user:pass in env.

set -euo pipefail

URL="${1:-https://txlookup.vercel.app}"
AUTH=""
if [ -n "${TXLOOKUP_BASIC_AUTH:-}" ]; then
  AUTH="-u ${TXLOOKUP_BASIC_AUTH}"
fi

QUESTIONS=(
  "Food truck permits issued in 78702 in the last six months"
  "Restaurants near 78704 with failing inspections this year"
  "311 response times across all 10 council districts"
  "Where are construction permits growing fastest by zip?"
)

echo "═══════════════════════════════════════════════════════════════════"
echo "TXLookup — demo cache warmer"
echo "Target: $URL"
echo "═══════════════════════════════════════════════════════════════════"
echo

# 1. Hit the homepage so the live ticker queries warm
echo "→ /                  (warming homepage Socrata queries)"
HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" $AUTH "$URL/")
echo "  HTTP $HOME_CODE"
echo

# 2. Hit each dataset detail page so per-dataset caches warm
echo "→ /datasets/3syk-w9eu (permits)"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" $AUTH "$URL/datasets/3syk-w9eu"
echo "→ /datasets/ecmv-9xxi (inspections)"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" $AUTH "$URL/datasets/ecmv-9xxi"
echo "→ /datasets/xwdj-i9he (311)"
curl -s -o /dev/null -w "  HTTP %{http_code}\n" $AUTH "$URL/datasets/xwdj-i9he"
echo

# 3. Run each marquee question through the live agent (the BIG warm)
for Q in "${QUESTIONS[@]}"; do
  echo "→ /api/agent: \"$Q\""
  RES=$(curl -sN --max-time 60 -X POST "$URL/api/agent" \
    -H 'Content-Type: application/json' \
    --data "{\"query\": \"$Q\"}" 2>&1 || true)
  PHASES=$(echo "$RES" | grep -oE '"phase":"[^"]+"' | sort -u | tr '\n' ' ')
  DONE=$(echo "$RES" | grep -c '"phase":"done"' || true)
  echo "  phases seen: $PHASES"
  echo "  done events: $DONE"
  echo
done

# 4. Run each marquee through demo-mode too (fixture replay) so it's also primed
echo "→ Warming demo-mode fixtures (?demo=1)..."
for Q in "${QUESTIONS[@]}"; do
  curl -sN --max-time 15 -X POST "$URL/api/agent?demo=1" \
    -H 'Content-Type: application/json' \
    --data "{\"query\": \"$Q\"}" > /dev/null 2>&1 || true
done
echo "  done"
echo

echo "═══════════════════════════════════════════════════════════════════"
echo "✓ Warm-up complete."
echo "  Demo-mode toggle:  /q?q=<...>&demo=1   (or pass demo:true in body)"
echo "  Live mode:         /q?q=<...>"
echo "═══════════════════════════════════════════════════════════════════"
