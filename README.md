# pOS

pOS is an installable web app (PWA) for property owners in India. It tracks rent, tenants, UPI payments, maintenance requests and expenses in one place, with separate views for **owners**, **staff** and **tenants**.

The whole product runs on **Cloudflare**: a single Worker serves the React app as static assets and answers every `/api/*` request, backed by D1 (database), R2 (photos), Queues and Cron Triggers (the daily rent cycle) and Workers AI (meter-photo reading).

```
Browser / installed PWA
        │
        ▼
Cloudflare Worker "pos"  ──  static assets (dist/)       → React app, offline shell, icons
        │                └─  /api/*  (Hono)             → auth, rent, payments, requests, PDFs data
        ├── D1  "pos"          every table
        ├── R2  "pos-photos"   private photos and cached reports
        ├── Queue "pos-daily"  one message per workspace for the daily cycle
        ├── Cron 00:30 UTC     06:00 IST daily rent cycle
        └── Workers AI         meter photo → reading (optional)
```

## Features

- **Owners:** properties and units, tenants and leases, monthly rent charges, late fees, multi-month and advance payments, UPI QR codes, receipts and rental agreements (PDF), move-out settlements, expenses, recurring charges, reports, statements, invites and a full JSON backup.
- **Staff:** a "Today" list, units, maintenance requests, meter readings and expenses.
- **Tenants:** what is due, "I have paid" claims, payment history, lease, statements and requests.
- **Everywhere:** works offline as an installed app (outbox for actions made offline), Web Push notifications, English and Hindi.

## Deploy to Cloudflare

Pick one. All three are documented step by step in [`docs/cloudflare/`](docs/cloudflare/README.md).

| Method | Best for | Daily job | Guide |
| --- | --- | --- | --- |
| **Workers + Wrangler CLI** (recommended) | Anyone with a terminal | Built-in Cron + Queue | [deploy-workers.md](docs/cloudflare/deploy-workers.md) |
| **GitHub Actions** | Deploy on every push to `main` | Built-in Cron + Queue | [deploy-github-actions.md](docs/cloudflare/deploy-github-actions.md) |
| **Pages drag-and-drop** | No terminal on the Cloudflare side | Small companion cron Worker | [deploy-pages-upload.md](docs/cloudflare/deploy-pages-upload.md) |

The short version (Workers + Wrangler):

```bash
npm install
npm run cf:login      # opens the browser once
npm run cf:setup      # creates D1, R2 and the queue, writes database_id into wrangler.jsonc
npm run deploy        # builds, applies D1 migrations, deploys
```

Your app is then live at `https://pos.<your-subdomain>.workers.dev`. Sign up to create your owner workspace, then set `SIGNUPS` to `closed` if nobody else should be able to start one (invited staff and tenants can still join). See [quickstart.md](docs/cloudflare/quickstart.md) for the full ten-minute walkthrough and [deploy-checklist.md](docs/cloudflare/deploy-checklist.md) before going live.

## Run locally

Requires Node.js 22.18 or newer (24 recommended, see `.nvmrc`).

```bash
npm install
cp .dev.vars.example .dev.vars   # optional local secrets
npm run dev:api                  # terminal 1: Worker + local D1/R2 on http://localhost:8787
npm run dev                      # terminal 2: Vite with hot reload on http://localhost:5173 (proxies /api)
```

Or run the production build exactly as Cloudflare would serve it, on one port:

```bash
npm run preview                  # http://localhost:8787
```

Everything runs on your machine through Miniflare (the local Workers runtime), so nothing touches your Cloudflare account and no login is needed. `dev:api` starts the Worker without the Workers AI binding (meter-photo reading is off); after `npm run cf:login`, `npm run dev:api -- --ai` keeps it. More in [local-development.md](docs/cloudflare/local-development.md).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `dev:api` | Vite dev server / Worker API with local D1 and R2 |
| `npm run preview` | Production build served by `wrangler dev` |
| `npm run build` | Syncs migrations, builds the PWA into `dist/` |
| `npm run check` | Type-checks app, Worker, tests and configs |
| `npm test` | Unit and API tests (Node test runner + Miniflare D1/R2) |
| `npm run verify` | `check` + `test` + a dry-run Worker bundle |
| `npm run smoke` | Smoke test of a running pOS, local or deployed (`-- https://pos.example.com`): health incl. D1, static files, headers. Read-only unless `--write` |
| `npm run db:generate` | New Drizzle migration from `worker/db/schema.ts`, then `db:sync` |
| `npm run db:sync` | Copies Drizzle migrations to `migrations/` and embeds them for Pages |
| `npm run db:migrate:local` / `:remote` | Applies D1 migrations locally / in production |
| `npm run cf:setup` | Creates (or finds) D1, R2 and the queue |
| `npm run deploy` | Build, migrate production D1, deploy the Worker |
| `npm run deploy:dry` | Bundles the Worker without uploading |
| `npm run cf:secret -- NAME` | Sets a Worker secret |
| `npm run cf:tail` | Streams live production logs |
| `npm run cf:backup` | Exports production D1 to `backups/` |
| `npm run cf:reset-link -- email --url https://…` | Emergency password-reset link |
| `npm run cf:rollback` | Rolls the Worker back to the previous version |
| `npm run pages:bundle` | Builds `pos-upload.zip` for Pages drag-and-drop |
| `npm run cron:deploy` | Deploys the companion cron Worker (Pages only) |

## Tech stack

React 19, React Router 7, Vite 8 and vite-plugin-pwa on the front end; Hono 4 and Drizzle ORM on Cloudflare Workers; D1, R2, Queues, Cron Triggers and Workers AI; Node's built-in test runner with Miniflare for tests.

## Documentation

- [docs/README.md](docs/README.md) — documentation index
- [docs/architecture.md](docs/architecture.md) — how requests, data and the daily job flow
- [docs/project-structure.md](docs/project-structure.md) — what lives where
- [docs/cloudflare/](docs/cloudflare/README.md) — deployment, configuration and operations on Cloudflare
- [AGENTS.md](AGENTS.md) — conventions for anyone (human or AI) changing the code
