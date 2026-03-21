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

## General Rules

- No real secrets are required for local development or CI.
- No message content is logged or stored in the control-plane.
- No plaintext tokens are logged.
- All secrets are injected via environment variables; nothing is hardcoded.
