# Architecture

pOS is a React Progressive Web App and a Hono API deployed to Cloudflare. The recommended deployment is one Worker with static assets, D1, a Cron Trigger and a Queue.

## Request path

```text
Browser → Cloudflare static assets → React app
Browser → /api/* → worker/index.ts → Hono routes → domain logic → D1
```

`wrangler.jsonc` routes only `/api/*` through the Worker. Other requests are static files, with an SPA fallback for client-side routes. The browser calls the API on the same origin; the application does not require cross-origin API access.

The Worker entry sets request bindings before dispatch. Shared server modules read bindings through `bindings()` and string configuration through `env()`. API responses receive security headers from `worker/server/core/secure.ts`; static response headers are configured in `public/_headers`.

## Data and files

- D1 binding `DB` stores application tables, sessions, rate limits, secrets and migration records.
- Uploaded photos are stored as base64 text in D1's `photo_data` table. Access is through short-lived signed API URLs; no R2 bucket is used.
- PDF documents are generated in the browser from API data using `shared/pdf/`.
- The React app, styles, icons, manifest and generated service worker are built into `dist/`.

D1 does not provide interactive transactions. Payment and billing invariants use guarded statements, `db.batch()` and SQLite triggers. Keep schema migrations additive so old and new Worker versions can safely share the database during rollout.

## Daily processing

The Workers deployment's Cron Trigger runs at `00:30 UTC` (`06:00 IST`). It lists owner workspaces and sends one message per workspace to `DAILY_QUEUE`. Queue messages create due rent charges, end completed tenancies, record reminders, apply fees, generate recurring expenses, raise lease alerts and send pending pushes. The queue retries a failed workspace message; independently failing daily steps are logged so later steps can continue. Expired sessions and rate-limit records are pruned.

If the queue binding is removed, the cron runs the cycle inline. Cloudflare Pages has neither Cron Triggers nor Queues, so its deployment uses `cloudflare/cron-worker/` to call the protected API in steps.

## Deploy targets

| | Workers (recommended) | Pages upload |
| --- | --- | --- |
| Entry | `worker/index.ts` | `worker/pages-entry.ts` |
| Build | `npm run deploy` | `npm run pages:bundle` |
| Migrations | Wrangler applies before deployment | Pages Worker applies on first API request |
| Daily job | Built-in Cron Trigger and Queue | Companion Cron Worker |
| Bindings | `wrangler.jsonc` | Pages project settings |

Pages migration state is recorded in `pos_migrations`; the Pages runner also recognizes Wrangler's `d1_migrations` table. See [Pages deployment](cloudflare/deploy-pages-upload.md) before switching deployment methods.

## PWA and offline behavior

Vite builds the React app and configures the service worker and manifest. The service worker caches the app shell and static assets, not API responses. The client outbox holds supported actions made while offline and syncs them when connectivity returns. `public/push-sw.js` handles Web Push events.
