# Architecture

pOS is one Cloudflare Worker. It has three jobs, each a handler exported from `worker/index.ts`:

| Handler | Trigger | What it does |
| --- | --- | --- |
| `fetch` | HTTP request to `/api/*` | Runs the Hono API (`worker/server/routes.ts`) |
| `scheduled` | Cron Trigger, 00:30 UTC (06:00 IST) | Starts the daily rent cycle |
| `queue` | Message on `pos-daily` | Runs the daily cycle for one workspace |

Everything that is not `/api/*` is a static file from `dist/` and **never starts the Worker** (`assets.run_worker_first: ["/api/*"]` in `wrangler.jsonc`). Static requests are free and served from Cloudflare's cache; unknown paths fall back to `index.html` so client-side routes such as `/tenants/42` work on reload.

## Request flow

```
GET /tenants/42          → Workers static assets → dist/index.html (SPA fallback) → React Router
GET /assets/app-x1y2.js  → Workers static assets (cached 1 year, immutable: public/_headers)
POST /api/auth/signin    → Worker fetch → setBindings(env) → Hono → Drizzle → D1
GET /api/photos/:key     → Worker fetch → signed-URL check → R2
```

On every invocation the entry point calls `setBindings(env)`. Modules then read bindings through `bindings()` and settings through `env("NAME")` (`worker/server/core/`), so no request object has to be threaded through domain code. An isolate always serves one deployment, so the bindings never change under a running request.

API responses get security headers from `worker/server/core/secure.ts`; static files get theirs (including the Content-Security-Policy) from `public/_headers`.

## Data

| Store | Binding | Holds |
| --- | --- | --- |
| D1 `pos` | `DB` | Every table (`worker/db/schema.ts`): users, sessions, workspaces, properties, units, tenants, tenancies, charges, payments, requests, expenses, documents, notifications, rate limits, generated secrets |
| R2 `pos-photos` | `PHOTOS` | Private photos (maintenance, comments, meters) and cached report data. Served only through signed, expiring `/api/photos/:key` URLs |

D1 has no interactive transactions. Money paths stay consistent through single statements that check and write together, `db.batch([...])` for writes that must land together, and SQLite triggers that refuse anything that would over-pay a month (`migrations/*payment_guards*.sql`). `worker/db/index.ts` also works around D1's 100-bound-parameter limit by safely inlining values for the few large `IN (...)` queries.

## The daily rent cycle

```
Cron 00:30 UTC → scheduled() → list workspaces → DAILY_QUEUE.sendBatch (≤100 per call)
                                                   │
                         queue() ← one message per workspace
                           └── runDailyForOwner (worker/server/toolRoutes.ts):
                                 1. create the month's rent charges, end finished tenancies
                                 2. queue rent reminders
                                 3. apply late fees
                                 4. generate recurring expenses
                                 5. lease-ending alerts
                                 6. send pending Web Push notifications
                               a failing step is logged and the others still run;
                               a thrown error retries the workspace after 5 minutes (max 5 tries)
               scheduled() also prunes expired sessions, reset links and rate-limit counters
```

Without a `DAILY_QUEUE` binding the cycle runs inline in `scheduled()`. On the Pages deployment, which has neither Cron nor Queues, a tiny companion Worker (`cloudflare/cron-worker/`) calls `POST /api/cron/daily` step by step. The same endpoint, protected by `CRON_SECRET`, lets you run the cycle by hand.

## Two deploy targets, one codebase

| | Workers (`worker/index.ts`) | Pages (`worker/pages-entry.ts`) |
| --- | --- | --- |
| Built by | `wrangler deploy` | `npm run pages:bundle` → `dist/_worker.js` |
| Migrations | `wrangler d1 migrations apply` before deploy | Applied by the Worker on the first API request (`core/migrate.ts`, from `worker/migrations.generated.ts`) |
| Daily cycle | Cron Trigger + Queue | Companion cron Worker |
| Bindings | `wrangler.jsonc` | Pages dashboard → Settings → Bindings |
| `/api/health` | `{ ok: true }` | Setup checklist: which bindings are connected |

Both record applied migrations. The Pages build recognises Wrangler's `d1_migrations` table, so Workers → Pages needs nothing; Pages → Workers needs one SQL command to copy the records (see [deploy-pages-upload.md](cloudflare/deploy-pages-upload.md#moving-to-the-workers-deployment-later)).

## Front end

`src/` is a React 19 single-page app built by Vite into `dist/`. `vite-plugin-pwa` generates the service worker and manifest; `public/push-sw.js` adds Web Push handling. The app always calls the API on its own origin (`/api`), so the session cookie is first-party and no CORS is involved. PDFs (receipts, agreements, statements, reports) are drawn in the browser by `shared/pdf/` from JSON the API returns, which keeps the Worker small and fast.

## Optional services

| Service | Binding / setting | Without it |
| --- | --- | --- |
| Workers AI | `AI` | People type meter readings |
| Email Service | `EMAIL` + `EMAIL_FROM` | Owners create reset links for staff and tenants in the app |
| Queues | `DAILY_QUEUE` | Daily cycle runs inline in the cron invocation |
| Web Push keys | `VAPID_*` secrets | A key pair is generated and stored in D1 on first use |
| Photo signing key | `SIGNING_SECRET` | A random key is generated and stored in D1 on first use |
