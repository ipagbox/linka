# Contributing

Linka is a private project. This guide is for contributors who have been explicitly invited.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Go 1.22+
- Docker and Docker Compose

### Getting Started

```bash
# Install all dependencies
bash deploy/install.sh

# Start all services
docker compose up

# Verify services are healthy
bash deploy/healthcheck.sh
```

### Frontend Development

```bash
cd web
pnpm dev       # start dev server at http://localhost:5173
pnpm lint      # run ESLint
pnpm typecheck # run TypeScript type check
pnpm test      # run unit tests (Vitest)
pnpm test:e2e  # run e2e tests (Playwright)
```

### Control Plane Development

```bash
cd control-plane
go run .        # start server at http://localhost:8080
go test ./...   # run tests
go vet ./...    # run vet
```

## Stage Discipline

All work must align with the current stage in `docs/DELIVERY_PLAN.md`.
Do not build features that belong to future stages.

## Pull Requests

- All CI checks must pass
- No new secrets introduced
- No plaintext sensitive logging
- Existing tests must not break

## Architecture Decisions

See `AGENTS.md` for fixed decisions (Matrix, Synapse, no custom crypto, etc.).
These are not open for debate within active stages.
