# Architecture

## Overview

Linka is a private, invite-only, self-hosted messaging system built on the Matrix protocol.

The system has three distinct layers with strict separation of concerns:

1. **Frontend (PWA)** — user interface, session management, Matrix SDK interaction
2. **Control plane (Rails)** — business logic only: invites, onboarding, access control
3. **Messaging layer (Synapse)** — message delivery, rooms, sync, E2EE

The control plane does **not** process or store message content. It never touches the messaging layer content directly.

---

## MVP user flow

```
1. User receives invite link:  https://domain/invite/<token>
2. Frontend validates token via control-plane API
3. If valid   → onboarding screen shown
4. If invalid → stable error state shown
5. User enters display name and confirms
6. Frontend creates Matrix account via SDK
7. Control-plane marks invite as consumed
8. Session saved in browser; restored on reload
9. User enters app shell (chat list, navigation)
```

---

## MVP constraints (what is excluded)

- No public registration
- No public channels or broadcasts
- No voice/video calls
- No bots
- No custom cryptography
- No complex search
- No federation UI (single homeserver in current stages)

---

## Components

### Frontend (web/)

- React 18 + TypeScript + Vite
- Progressive Web App (PWA)
- Communicates with the control-plane over HTTP JSON API
- Uses matrix-js-sdk for Matrix account creation (Stage 3+)
- Routes: `/invite/:token` (onboarding), `/` (app shell or placeholder)
- Session stored in localStorage; validated structurally on restore

### Control Plane (rails-api/)

- Ruby on Rails (API-only mode)
- Handles invite domain, onboarding support, account/bootstrap orchestration
- Versioned JSON API under /api/v1/
- Does NOT process or store message content
- Does NOT implement messaging transport
- PostgreSQL via ActiveRecord

### Messaging (Synapse)

- Matrix homeserver (Synapse)
- All message content lives in Synapse, not the control-plane
- Matrix federation is a future-stage concern

### Database (PostgreSQL 16)

- Used by the Rails control-plane only
- Synapse manages its own data directory separately

## API Endpoints (Stages 2–3)

```
GET  /health                         — health check (backward compat)
GET  /api/v1/health                  — health check
POST /api/v1/invites                 — create invite, returns raw token once
GET  /api/v1/invites/:token          — validate invite status
POST /api/v1/invites/:token/consume  — consume invite
```

## Invite Token Design

- Raw token: `SecureRandom.urlsafe_base64(32)` (returned once at creation)
- Stored token: `SHA256(raw_token)` hex digest
- Lookup: always via digest, never by storing raw token
- Minimum token length enforced at lookup time (16 chars)

## Service Ports (Development)

| Service       | Port |
|---------------|------|
| PostgreSQL    | 5432 |
| Synapse       | 8008 |
| Control Plane | 8080 |
| Web (Nginx)   | 3000 |

## Session Design (Stage 4)

- Session stored client-side in localStorage as JSON under key `linka_session`
- Fields: version, userId, accessToken, deviceId, homeserver, displayName
- `version` field enables forward-compatible format changes; current value: SESSION_VERSION = 1
- Validation on load: structural check (all fields, correct types) + version match
- Invalid/corrupted/mismatched-version sessions are discarded and cleared on boot
- App boot flow (async):
  1. Load session from storage
  2. If invalid → clear session → show onboarding placeholder
  3. If valid → call Matrix whoami to validate access token
     - 401 response → clear session → show onboarding placeholder
     - Success → show app shell
     - Network error → proceed optimistically → show app shell
- Persists across reload; cleared on logout
- Logout: clears localStorage session, redirects to placeholder

## Environment Variables (Frontend)

| Variable | Default | Purpose |
|---|---|---|
| VITE_CONTROL_PLANE_URL | http://localhost:8080 | Rails control-plane base URL |
| VITE_MATRIX_HOMESERVER | http://localhost:8008 | Synapse homeserver base URL |

## Direct Messaging Flow (Stage 5)

```
User action: open app shell
  → AppShell creates MatrixClient (createMatrixClient)
  → client.startClient() begins sync loop
  → ClientEvent.Sync 'PREPARED' → getDirectRooms() → ChatList rendered

User action: click room
  → selectedRoomId set → ChatRoom rendered
  → getRoomMessages() reads current timeline
  → RoomEvent.Timeline listener registered

User action: type message + send
  → optimistic Message{status:'sending'} added to local state
  → sendMatrixMessage() → client.sendTextMessage()
  → success: status → 'sent', eventId stored
  → failure: status → 'failed', retry button shown

Incoming message (from peer):
  → Matrix sync delivers event
  → RoomEvent.Timeline fires
  → getRoomMessages() refreshes serverMessages
  → optimistic message deduped by eventId
```

Deduplication: local optimistic messages are removed from view once their eventId
appears in serverMessages (delivered by sync).

## Stage Discipline

The control-plane must not:
- Process or store message content
- Implement messaging transport
