# Delivery Plan

This document defines the execution stages of the Linka project and acts as the single source of truth for current progress.

---

## Current stage

Stage 2 — Invite domain

---

## Completed stages

- Stage 0 — Foundation
- Stage 1 — Runtime bootstrap

---

## Known constraints

- Internet access may be restricted during execution
- Push to remote repository may fail; patch/diff output is acceptable
- Browser installation must not rely on runtime downloads during tests
- No real secrets are required for local or CI execution

---

## Stage sequence

1. Foundation
2. Runtime bootstrap
3. Invite domain
4. Onboarding and account bootstrap
5. Auth and session restoration
6. Direct messaging
7. Reliability and offline behavior
8. Private groups and attachments
9. Hardening
10. UI polish and design system completion
11. Future optional work (calls, federation UI, multi-account)

---

## Stage 0 — Foundation

Status: done

Goal:
Establish repository structure, governance docs, CI pipeline, testing foundation, and deployment scaffolding.

Definition of done:
- monorepo structure created
- documentation files created and coherent
- CI workflow defined
- frontend testing setup exists
- control-plane skeleton exists
- deployment scaffolding exists

Artifacts:
- README.md
- AGENTS.md
- CONTRIBUTING.md
- docs/*
- CI workflow
- initial tests

---

## Stage 1 — Runtime bootstrap

Status: done

Goal:
Make the system bootable and testable in both local and CI environments.

In scope:
- docker compose baseline
- web app bootable placeholder
- control-plane bootable service
- postgres service
- synapse service
- healthcheck flow
- deterministic dependency installation
- browser setup for Playwright (non-runtime)

Out of scope:
- onboarding logic
- invite system logic
- messaging UI
- production-grade federation
- calls or media features

Definition of done:
- `docker compose up` starts all required services
- web app responds successfully
- control-plane `/health` responds successfully
- healthcheck script reports success
- CI installs dependencies and runs successfully
- Playwright browsers are available without runtime download during test execution
- no real secrets required

Required artifacts:
- working docker-compose.yml
- working docker-compose.prod.yml (basic scaffold)
- install.sh updated if needed
- healthcheck.sh working
- CI workflow updated if needed
- documentation updated if behavior changed

Validation steps:
- run `docker compose up`
- run `bash deploy/healthcheck.sh`
- run CI pipeline
- run frontend tests
- verify no browser download during test execution

Regression guard:
- existing tests must pass
- no new secrets introduced
- no plaintext sensitive logging

---

## Stage 2 — Invite domain

Status: pending

Goal:
Introduce invite-only access control.

In scope:
- invite token generation
- invite validation
- invite consumption
- one-time usage enforcement

Out of scope:
- UI onboarding
- messaging
- session UX

Definition of done:
- valid invite can be created and validated
- invite cannot be reused after consumption
- invalid/expired tokens are rejected
- unit and integration tests cover edge cases

---

## Stage 3 — Onboarding and account bootstrap

Status: pending

Goal:
Allow user to join system via invite and create account.

In scope:
- invite route handling in PWA
- onboarding screen
- integration with control-plane
- account creation via Matrix SDK
- session persistence

Out of scope:
- chat UI
- groups
- attachments

Definition of done:
- valid invite opens onboarding
- invalid invite shows stable error state
- user account created successfully
- session persists after reload

---

## Stage discipline

- Work strictly within the current stage.
- Do not implement future-stage features early.
- If future work is discovered, document it but do not build it.
- A stage is complete only when its definition of done is fully satisfied.
