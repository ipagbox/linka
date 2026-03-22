# Agent Guidelines

This document defines how automated agents should operate in this repository.

## Repository Overview

Linka is a self-hosted, invite-only PWA messenger built on Matrix/Synapse.

**One sentence:** Linka is a self-hosted private messenger by invitation, built on Matrix, with a minimalist interface focused on reliability and control.

## Product principles

1. **Invite-only** — no open registration; every user enters via a token
2. **Privacy** — messages are not logged in the control-plane; E2EE via Matrix (Olm/Megolm)
3. **Simplicity** — minimum features; no social mechanics; no overloaded UI
4. **Control** — the user controls the server; no dependency on centralised services

## What agents must NOT build

- Public registration or any open discovery mechanism
- Public channels or broadcast features
- Voice/video calls (future optional stage, not in current scope)
- Custom cryptography of any kind — use Matrix SDK only
- Bots or automation APIs
- WhatsApp/Telegram-style social mechanics (reactions, stickers, status, etc.)
- Any feature that belongs to a future stage — always check DELIVERY_PLAN.md first

## Architecture

- `web/` — React + TypeScript + Vite PWA frontend
  - Routes: `/invite/:token` (onboarding), `/` (app shell or placeholder)
  - Uses matrix-js-sdk for Matrix account creation
  - Session persisted in localStorage
- `rails-api/` — Ruby on Rails control-plane (invite domain, onboarding, access control)
- `control-plane/` — legacy Go directory, superseded by the Ruby on Rails control-plane; health-check behaviour preserved in Rails
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
- Control-plane tests: `bundle exec rspec` (in rails-api/)
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
- rspec (Rails)

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
