# Linka

Private, invite-only, self-hosted messaging for trusted contacts.

Built on Matrix/Synapse. Not a social network. Not an entertainment app. A reliable private communication channel.

> **One sentence:** Linka is a self-hosted private messenger by invitation, built on Matrix, with a minimalist interface focused on reliability and control.

---

## What Linka is

- Private messenger, invite-only — no open registration
- Self-hosted: you own and control the server
- A tool for communication between trusted people
- Calm, minimal interface without noise
- Reliable communication channel

## What Linka is NOT

- Not a social network
- Not an entertainment chat
- Not a Telegram / WhatsApp clone
- Not a platform for public channels or broadcasts
- Not a product with open registration

---

## UI / UX philosophy

**Core feeling:** "a calm terminal of communication"

- Minimalism — functionality over decoration
- Dark theme by default, soft colours, flat design
- No WhatsApp-style bubbles, no Telegram aesthetics
- Predictable states: pending / error / success — always clear
- No gamification, no social mechanics, no entertainment elements

---

## Status

Stage 2 (Invite domain) — complete. See [docs/DELIVERY_PLAN.md](docs/DELIVERY_PLAN.md).

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, PWA |
| Messaging | Matrix protocol, Synapse homeserver |
| Control plane | Ruby on Rails (API-only) |
| Database | PostgreSQL |

---

## Quick start

```bash
# Install all dependencies (including Playwright browsers)
bash deploy/install.sh

# Start all services
docker compose up

# Verify all services are healthy
bash deploy/healthcheck.sh
```

Services:
- Web app: http://localhost:3000
- Control plane: http://localhost:8080/health
- Synapse: http://localhost:8008/_matrix/client/versions

---

## Development

### Frontend

```bash
cd web
pnpm dev         # dev server at http://localhost:5173
pnpm lint        # ESLint
pnpm typecheck   # TypeScript
pnpm test        # Vitest unit tests
pnpm test:e2e    # Playwright e2e tests (requires browsers installed)
```

### Control plane (Rails)

```bash
cd rails-api
bundle exec rails server -p 8080   # server at http://localhost:8080
bundle exec rspec                  # run tests
```

---

## Architecture notes

- Control plane does NOT process or store message content
- No custom cryptography — Matrix SDK handles E2EE (Olm/Megolm)
- Single homeserver now; federation in a future stage
- All secrets via environment variables; see `.env.example`

---

## Constraints

See [AGENTS.md](AGENTS.md) for fixed architectural decisions.
See [CONTRIBUTING.md](CONTRIBUTING.md) for development process.
