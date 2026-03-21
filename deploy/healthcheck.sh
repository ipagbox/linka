#!/usr/bin/env bash
# healthcheck.sh — Verify that all Linka services are responding
# Run after `docker compose up`: bash deploy/healthcheck.sh

set -euo pipefail

WEB_URL="${WEB_URL:-http://localhost:3000}"
CONTROL_PLANE_URL="${CONTROL_PLANE_URL:-http://localhost:8080}"
SYNAPSE_URL="${SYNAPSE_URL:-http://localhost:8008}"
MAX_WAIT="${MAX_WAIT:-60}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
    echo "[OK]   $name ($url)"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $name ($url)"
    FAIL=$((FAIL + 1))
  fi
}

wait_for() {
  local name="$1"
  local url="$2"
  local waited=0
  echo "[WAIT] Waiting for $name ($url)..."
  while ! curl -sf --max-time 3 "$url" > /dev/null 2>&1; do
    if [ "$waited" -ge "$MAX_WAIT" ]; then
      echo "[FAIL] $name did not become ready within ${MAX_WAIT}s"
      return 1
    fi
    sleep 2
    waited=$((waited + 2))
  done
  echo "[OK]   $name is ready (${waited}s)"
}

echo "--- Linka Healthcheck ---"
echo ""

# Wait for services to be ready (useful right after docker compose up)
wait_for "web"           "$WEB_URL"
wait_for "control-plane" "$CONTROL_PLANE_URL/health"
wait_for "synapse"       "$SYNAPSE_URL/_matrix/client/versions"

echo ""
echo "--- Detailed checks ---"
check "web"                       "$WEB_URL"
check "control-plane /health"     "$CONTROL_PLANE_URL/health"
check "synapse /_matrix/client"   "$SYNAPSE_URL/_matrix/client/versions"

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "All $PASS checks passed."
  exit 0
else
  echo "$FAIL check(s) failed, $PASS passed."
  exit 1
fi
