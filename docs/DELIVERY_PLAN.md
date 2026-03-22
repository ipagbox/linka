# Delivery Plan

This document defines the execution stages of the Linka project and acts as the single source of truth for current progress.

---

## Current stage

Stage 5 — Direct messaging

---

## Completed stages

- Stage 0 — Foundation
- Stage 1 — Runtime bootstrap
- Stage 2 — Invite domain
- Stage 3 — Onboarding and account bootstrap
- Stage 4 — Auth and session stabilization

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

## Stage 4 — Auth and session stabilization

Status: done

Goal:
Stabilize authentication and session handling for predictable, reliable app boot.

In scope:
- versioned session structure (SESSION_VERSION field)
- session validation on app boot (structure + Matrix token check)
- async boot flow with deterministic loading → authenticated/unauthenticated states
- invalid/corrupted session safely discarded and cleared
- expired Matrix token (401) triggers clean logout
- network errors during validation handled optimistically (keep session)
- logout flow: clear session storage, reset app state, redirect to placeholder
- unit tests: session validation, version checks, boot state transitions
- integration tests: invalid token clears session, network error is optimistic
- e2e tests: corrupted session recovery, session persistence after reload, logout

Out of scope:
- chat UI or messaging
- push notifications
- groups or attachments
- advanced token refresh flows

Definition of done:
- session stored after onboarding with version field ✓
- session restores correctly after reload ✓
- invalid session (wrong version, bad JSON, missing fields) discarded safely ✓
- expired Matrix token (401) clears session and redirects ✓
- network error during validation proceeds optimistically ✓
- logout fully clears session and resets state ✓
- app boot logic is deterministic (loading → authenticated/unauthenticated) ✓
- unit, integration, and e2e tests pass ✓

Implementation notes:
- Session now includes `version: number` field (SESSION_VERSION = 1)
- saveSession() automatically injects current version; callers do not specify it
- loadSession() rejects any session with missing or mismatched version
- App boot: useEffect triggers async validation; shows "Loading…" until resolved
- validateMatrixSession() calls client.whoami(); returns false on 401, throws on network errors
- App.tsx handles the three outcomes: valid → AppShell, invalid → unauthenticated, error → optimistic AppShell

Regression guard:
- all Stage 3 onboarding tests must pass
- all Stage 2 API specs must pass
- no secrets required for local execution

---

## Stage 5 — Direct messaging

Status: done

Goal:
Enable text message exchange between two users via Matrix.

In scope:
- Matrix client lifecycle (create, start sync, stop)
- chat list (DM rooms from m.direct account data)
- open direct chat room
- text message sending with optimistic UI
- text message receiving via Matrix sync events
- message status: sending → sent / failed
- retry mechanism for failed messages
- basic message list (no chat bubble style)

Out of scope:
- file/image attachments
- group rooms
- push notifications
- offline queue
- read receipts / typing indicators (Stage 6+)

Definition of done:
- user sees chat list ✓
- user can open a chat ✓
- user can send a message ✓
- message appears immediately (optimistic UI) ✓
- message transitions through states correctly ✓
- incoming messages appear in UI ✓
- failures are visible ✓
- retry mechanism exists ✓
- no backend message handling introduced ✓
- unit, integration, and e2e tests pass ✓

Implementation notes:
- Matrix client created in AppShell on mount, stopped on unmount
- getDirectRooms() reads m.direct account data to enumerate DM rooms
- ChatRoom subscribes to RoomEvent.Timeline for incoming messages
- Optimistic messages held in local state; deduped against server events by eventId
- AppShell accepts full Session prop (was displayName only in Stage 4)
- All messaging utilities in messaging.ts; pure reducer applyMessageStatusTransition is independently testable

Regression guard:
- all Stage 4 auth/session tests pass
- all Stage 3 onboarding tests pass
- all Stage 2 API specs pass

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
