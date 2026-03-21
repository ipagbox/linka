#!/usr/bin/env bash
# install.sh — Set up the Linka development environment
# Run from the repository root: bash deploy/install.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[install] Starting Linka dependency installation..."

# --- pnpm ---
if ! command -v pnpm &>/dev/null; then
  echo "[install] pnpm not found, installing via npm..."
  npm install -g pnpm@10
fi

echo "[install] pnpm version: $(pnpm --version)"

# --- Frontend dependencies ---
echo "[install] Installing frontend dependencies..."
(cd web && pnpm install --frozen-lockfile)

# --- Playwright browsers ---
# Browsers are installed at setup time, NOT at test execution time.
echo "[install] Installing Playwright browsers (chromium)..."
(cd web && pnpm exec playwright install --with-deps chromium)

# --- Ruby / Rails (control-plane) ---
if ! command -v ruby &>/dev/null; then
  echo "[install] ERROR: Ruby is not installed. Install Ruby 3.3+ and re-run."
  exit 1
fi

echo "[install] Ruby version: $(ruby --version)"
echo "[install] Installing Rails API dependencies..."
(cd rails-api && bundle install)

echo "[install] Installation complete."
echo ""
echo "  Start all services:    docker compose up"
echo "  Run healthcheck:       bash deploy/healthcheck.sh"
echo "  Frontend tests:        cd web && pnpm test"
echo "  Frontend e2e tests:    cd web && pnpm test:e2e"
echo "  Rails tests:           cd rails-api && bundle exec rspec"
