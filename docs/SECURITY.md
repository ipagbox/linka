# Security Notes

This document records security-relevant design decisions and known limitations.

## Invite Token Handling

### Token generation

Invite tokens are generated using `SecureRandom.urlsafe_base64(32)`, producing
approximately 256 bits of entropy. This is sufficient for unpredictability in
invite links.

### Token storage

Only a SHA256 hex digest of the raw token is stored in the database.
The raw token is returned once in the API response at creation time and is not
logged or stored anywhere else.

### Token lookup

Lookup always operates on the digest. A minimum token length check
(`TOKEN_MIN_LENGTH = 16`) is applied before computing the digest, to
reject trivially short inputs without database roundtrips.

### Known limitations (Stage 2)

- Invite creation is not authenticated. Any caller can create an invite.
  Authentication for invite creation is deferred to Stage 3/5.
- No rate limiting is applied to invite validation or consumption endpoints.
  Rate limiting is a future-stage hardening concern.
- The `consume!` method uses `with_lock` (SELECT FOR UPDATE) to guard against
  duplicate concurrent consumption of the same invite, but this does not protect
  against distributed replay across multiple application instances without a
  shared database lock, which is already satisfied by the single-DB design.
- `SECRET_KEY_BASE` in docker-compose.yml is a placeholder value.
  A real production deployment must use a securely generated secret.

## Session Security (Stage 4)

### Session storage

Sessions are stored in localStorage as JSON. This is appropriate for a self-hosted,
trusted-contact messaging system. localStorage is not accessible cross-origin.

### Session validation

On every app boot, the stored session is validated in two steps:
1. Structural: all required fields present and correctly typed; version matches SESSION_VERSION
2. Token: Matrix `whoami` call verifies the access token is still accepted by the homeserver

A 401 response from the homeserver causes immediate session clearance and redirect.
Structural failures (bad JSON, missing fields, version mismatch) also cause session clearance.
Network errors during token validation are treated optimistically (session kept) to avoid
locking out users during connectivity issues.

### Version field

The `version` field in the session JSON allows safe migration of the session format.
Sessions from a previous version are automatically discarded and cleared on boot.

### Known limitations (Stage 4)

- Access tokens are stored in localStorage (not httpOnly cookies). This is the standard
  approach for Matrix clients and is acceptable for a self-hosted system.
- No automatic token refresh is implemented. If a token expires, the user must re-onboard.
  Token refresh is a future-stage concern.
- No token rotation on logout. The access token is simply cleared from localStorage;
  the server-side session is not explicitly invalidated (future hardening concern).

## General Rules

- No real secrets are required for local development or CI.
- No message content is logged or stored in the control-plane.
- No plaintext tokens are logged.
- All secrets are injected via environment variables; nothing is hardcoded.
