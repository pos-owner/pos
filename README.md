# pOS

pOS is an installable React web app for property owners in India. It brings rent, tenants, payments, maintenance, utility readings, expenses and documents into one place, with separate owner, staff and tenant experiences.

## How it runs

The recommended production setup is one Cloudflare Worker. It serves the static PWA from `dist/`, handles the Hono API at `/api/*`, and runs the daily rent cycle with a Cron Trigger and Queue. D1 stores application records and uploaded photos. Workers AI can read meter photos; this is optional. No R2 bucket is required.

The alternative Pages upload uses the same app and API, but needs a small companion Worker for the daily job.

## Main capabilities

- Owners manage properties, units, leases, tenants, rent charges, fees, payment claims, receipts, agreements, settlements, expenses, reports, statements, invitations and backups.
- Staff can work with assigned units, maintenance requests, expenses and meter readings.
- Tenants can review rent and payment history, submit payment claims, view lease information and raise or follow requests.
- The app supports offline navigation and queued actions, installable PWA behavior, Web Push, English and Hindi, receipt verification, and PDF documents.

## Run locally

Requires Node.js 22.18 or newer (Node 24 is used in CI).

```bash
npm install
cp .dev.vars.example .dev.vars   # optional local settings
npm run dev:api                  # terminal 1: Worker and local D1 on :8787
npm run dev                      # terminal 2: Vite on :5173
```

Open `http://localhost:5173`. Vite proxies `/api` to the local Worker. To test the production build and static-asset behavior, run `npm run preview`.

## Deploy

For a new Workers deployment, authenticate and create the D1 database and queue once:

```bash
npm run cf:login
npm run cf:setup
npm run cf:secret -- CRON_SECRET
npm run deploy
```

`npm run deploy` builds the app, applies pending D1 migrations, then publishes the Worker. See the [Cloudflare guides](docs/cloudflare/README.md) for CI, Pages, domains, operations and configuration.

## Quality checks

```bash
npm run check       # TypeScript
npm test            # unit and API tests
npm run verify      # type-check, tests, production build and Worker dry-run
npm run smoke       # read-only checks against a running local or deployed app
```

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Project structure](docs/project-structure.md)
- [Cloudflare deployment and operations](docs/cloudflare/README.md)
- [Contributor conventions](AGENTS.md)
