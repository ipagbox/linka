# Architecture

## Overview

Linka is a private, invite-only, self-hosted messaging system built on the Matrix protocol.

## Components

### Frontend (web/)

- React 18 + TypeScript + Vite
- Progressive Web App (PWA)
- Communicates with the control-plane over HTTP JSON API
- Will use Matrix SDK for messaging (future stage)

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

## API Endpoints (Stage 2)

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

## Stage Discipline

The control-plane must not:
- Process or store message content
- Implement messaging transport
- Create Matrix accounts (until Stage 3)
- Implement session UX (until Stage 5)
