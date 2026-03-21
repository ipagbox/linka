# Agent Guidelines

This document defines how automated agents should operate in this repository.

## Repository Overview

Linka is a self-hosted, invite-only PWA messenger built on Matrix/Synapse.

## Architecture

- `web/` — React + TypeScript + Vite PWA frontend
- `control-plane/` — Go HTTP service (invite management, control APIs)
- `deploy/` — deployment and operations scripts
- `docs/` — project documentation and delivery plan

## Stage Discipline

Always check `docs/DELIVERY_PLAN.md` before starting work.
Work strictly within the current stage.
Do not implement future-stage features early.

## Code Rules

- No custom cryptography — use Matrix SDK (Olm/Megolm)
- No plaintext message logging
- Control-plane must not store or process message content
- All secrets via environment variables; never hardcoded
- Use `.env.example` for documentation; never commit real secrets

## Testing

- Frontend unit tests: `pnpm test` (Vitest)
- Frontend e2e tests: `pnpm test:e2e` (Playwright)
- Control-plane tests: `go test ./...`
- Playwright browsers must be installed before running e2e tests

## Dependency Policy

- Deterministic installs only (`--frozen-lockfile` for pnpm, `go mod download`)
- No runtime downloads during test execution
- Browsers installed at setup time, not test time

## CI

CI is the source of truth. All checks must pass:
- lint
- typecheck
- unit tests
- e2e tests
- go tests

## Commit Messages

Use clear, imperative commit messages:
- `add: X` — new capability
- `fix: X` — bug fix
- `update: X` — change to existing capability
- `chore: X` — tooling, deps, config

## Security

- Never log sensitive data
- No external network requests beyond declared dependencies
- No unknown scripts downloaded at runtime
