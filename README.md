# Linka

Private, invite-only, self-hosted messaging for trusted contacts.

Built on Matrix/Synapse. Not a social network. Not an entertainment app. A reliable private communication channel.

---

## Status

Stage 1 (Runtime bootstrap) — complete. See [docs/DELIVERY_PLAN.md](docs/DELIVERY_PLAN.md).

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, PWA |
| Messaging | Matrix protocol, Synapse homeserver |
| Control plane | Go (invite management, control APIs) |
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

### Control plane

```bash
cd control-plane
go run .          # server at http://localhost:8080
go test ./...     # run tests
go vet ./...      # run vet
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
