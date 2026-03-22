# Delivery Plan

This document defines the execution stages of the Linka project and acts as the single source of truth for current progress.

---

## Current stage

Stage 3 — Onboarding and account bootstrap

---

## Completed stages

- Stage 0 — Foundation
- Stage 1 — Runtime bootstrap
- Stage 2 — Invite domain

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

Status: done

Goal:
Introduce invite-only access control via a Ruby on Rails control-plane API.

In scope:
- invite token generation (secure random, digest-stored)
- invite validation (expired / exhausted / consumed / invalid states)
- invite consumption (single-use and multi-use)
- one-time and limited multi-use enforcement
- versioned JSON API: POST/GET/consume under /api/v1/invites
- Rails model, migration, request specs, model specs

Architecture note:
The control-plane is implemented in Ruby on Rails (not Go).
The rails-api/ directory is the canonical backend.
The legacy Go control-plane/ directory is superseded by the Ruby on Rails control-plane; its health-check behavior is preserved in Rails.

Out of scope:
- UI onboarding
- Matrix account creation
- messaging
- session UX

Definition of done:
- valid invite can be created and validated ✓
- invite cannot be reused after consumption ✓
- multi-use invites track and enforce max_uses ✓
- invalid/expired tokens are rejected ✓
- token digest stored; raw token returned once at creation ✓
- unit and request specs cover all required cases ✓

Future-stage work discovered:
- Stage 3: Invite route in PWA, onboarding screen, Matrix account creation
- Stage 3: Authentication for invite creation endpoint (currently open)

---

## Stage 3 — Onboarding and account bootstrap

Status: done

Goal:
Allow a user to join the system via an invite link and create a Matrix account.

In scope:
- invite route in PWA: `/invite/:token`
- token validation via control-plane API
- onboarding screen: display name input, confirm button
- Matrix account creation via matrix-js-sdk
- invite consumption via control-plane API after successful account creation
- session persistence in browser storage
- authentication for invite creation endpoint (currently open)

Out of scope:
- chat UI
- groups
- attachments
- push notifications

Definition of done:
- valid invite link opens onboarding screen ✓
- invalid/expired/consumed invite shows stable error state ✓
- user enters display name and account is created in Matrix ✓
- invite is marked as consumed in control-plane ✓
- session persists across browser reload ✓
- logout clears session completely ✓

Implementation notes:
- Matrix registration uses matrix-js-sdk with UIAA (m.login.dummy flow)
- Homeserver URL configured via VITE_MATRIX_HOMESERVER (default: http://localhost:8008)
- Control-plane URL configured via VITE_CONTROL_PLANE_URL (default: http://localhost:8080)
- Username auto-generated from display name + random suffix; password generated and not stored
- Session stored as JSON in localStorage under key 'linka_session'
- All tests mock matrix-js-sdk and HTTP endpoints; no real Synapse or control-plane required

Future-stage work discovered:
- Stage 4: Session validation on restore (check if Matrix token still valid)
- Stage 4: Handle token expiry and re-authentication
- Stage 8: Rate limiting on invite endpoints; auth for invite creation endpoint

Regression guard:
- all Stage 2 API specs must pass
- no secrets required for local execution

---

## Stage 4 — Auth and session restoration

Status: pending

Goal:
Make sessions robust: restore on reload, handle expiry, provide clean logout.

In scope:
- session restoration from browser storage on app load
- detection and handling of invalid/expired Matrix session
- logout flow: clear session, clear Matrix client state
- app shell: minimal navigation, chat list placeholder

Out of scope:
- actual message sending/receiving
- push notifications
- groups or attachments

Definition of done:
- app restores session on reload without re-login
- invalid session triggers clean re-onboarding or error
- logout clears all local state
- app shell renders with navigation

---

## Stage 5 — Direct messaging

Status: pending

Goal:
Enable text message exchange between two users in a private room.

In scope:
- direct chat creation via Matrix SDK
- text message sending
- text message receiving and display
- read receipts
- typing indicators
- basic message list UI (no WhatsApp/Telegram aesthetics)

Out of scope:
- file/image attachments
- group rooms
- push notifications
- offline queue

UI constraints:
- no chat bubble style
- minimal, calm, dark-theme UI
- functional states: sending / sent / error

Definition of done:
- two users can exchange text messages in a direct room
- read receipts visible
- typing indicator visible
- messages persist across reload (via Matrix sync)

---

## Stage 6 — Reliability and offline behavior

Status: pending

Goal:
Ensure messages are not lost when connectivity is poor or absent.

In scope:
- offline detection
- pending message queue (send on reconnect)
- reconnect and retry logic
- no message loss on disconnect/reconnect cycle
- visible pending / retry / failed states in UI

Out of scope:
- full offline browsing of history
- background sync via service worker (unless simple)

Definition of done:
- message sent while offline is queued
- message delivered on reconnect without user action
- failed messages show error state with retry option
- no duplicate delivery on reconnect

---

## Stage 7 — Private groups and attachments

Status: pending

Goal:
Extend messaging to private group rooms and add file/image support.

In scope:
- private group room creation
- inviting contacts to group rooms
- text messaging in groups
- image upload and preview
- file upload and download
- basic attachment preview

Out of scope:
- public rooms
- voice/video
- complex media gallery

Definition of done:
- group room can be created and members invited
- text messages work in groups
- images upload and render inline
- files upload and can be downloaded
- attachments do not break E2EE

---

## Stage 8 — Hardening

Status: pending

Goal:
Secure and stabilise the system for self-hosted production use.

In scope:
- rate limiting on invite and auth endpoints
- authentication for invite creation endpoint (if not done in Stage 3)
- security review of token handling and session management
- HTTPS enforcement in production config
- SECRET_KEY_BASE and other secrets documented and validated
- no plaintext sensitive data in logs
- Docker Compose production config reviewed

Out of scope:
- federation
- multi-server support
- external auth providers

Definition of done:
- rate limiting active on sensitive endpoints
- all secrets injected via environment, none hardcoded
- production docker-compose validated
- no sensitive data logged
- security notes in docs/SECURITY.md updated

---

## Stage 9 — UI polish and design system completion

Status: pending

Goal:
Bring the UI to a coherent, minimal, production-quality state.

In scope:
- consistent dark theme across all screens
- design token system (colours, spacing, typography)
- loading, empty, and error states for all views
- mobile-first layout validation
- PWA manifest and install prompt
- basic push notification setup (within PWA capabilities)
- accessibility baseline (keyboard nav, contrast)

Out of scope:
- custom illustrations or branding beyond minimalism
- animation-heavy transitions
- entertainment / gamification elements

Definition of done:
- all screens follow design system
- app installs as PWA on mobile
- push notifications work in supported browsers
- no broken states in happy path or error path

---

## Stage 10 — Future optional work

Status: future

Items (not committed, may be reprioritised):
- Voice/video calls (WebRTC via Matrix)
- Federation UI (multiple homeservers)
- Multi-account support
- Advanced search

---

## Stage discipline

- Work strictly within the current stage.
- Do not implement future-stage features early.
- If future work is discovered, document it but do not build it.
- A stage is complete only when its definition of done is fully satisfied.
