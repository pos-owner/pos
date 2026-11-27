# Deploy with Workers and Wrangler (recommended)

This is the full reference for the Workers deployment. For the short path, see [quickstart.md](quickstart.md).

## What gets deployed

One Worker named **`pos`** (from `wrangler.jsonc`) with:

| Part | Source | Purpose |
| --- | --- | --- |
| Script | `worker/index.ts` bundled by Wrangler (esbuild) | API, cron and queue handlers |
| Static assets | `dist/` from `npm run build` | The PWA, served without starting the Worker |
| D1 `DB` | database `pos` | All tables |
| R2 `PHOTOS` | bucket `pos-photos` | Photos and cached reports |
| AI `AI` | Workers AI | Meter readings (optional) |
| Queue `DAILY_QUEUE` | `pos-daily` (producer and consumer) | Daily cycle fan-out |
| Cron | `30 0 * * *` | Daily cycle at 06:00 IST |

## Prerequisites

- Node.js 22.18+ and `npm install` done.
- `npm run cf:login`, or the environment variables `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (the token needs the permissions listed in [deploy-github-actions.md](deploy-github-actions.md#1-create-an-api-token)).
- R2 enabled on the account (dashboard → R2 Object Storage, once).

## One-time setup

```bash
npm run cf:setup
```

`scripts/cf-setup.mjs` reads the names from `wrangler.jsonc` and, for each resource, creates it or recognises that it already exists. If `database_id` is still the all-zero placeholder it looks the database up (or creates it) and writes the real id into `wrangler.jsonc`. It is safe to run any number of times; CI runs it on every deploy.

Prefer to do it by hand? The equivalent is:

```bash
npx wrangler d1 create pos --location apac   # copy database_id into wrangler.jsonc (location: see database-d1.md)
npx wrangler r2 bucket create pos-photos
npx wrangler queues create pos-daily
```

### Using different names

Edit `database_name`, `bucket_name` and both `queue` entries in `wrangler.jsonc` before running `cf:setup`. To run two copies (for example `pos` and `pos-staging`), keep one `wrangler.jsonc` per copy, or use a Wrangler environment (`"env": { "staging": { ... } }`) and deploy with `npx wrangler deploy --env staging`. Each environment needs its own `d1_databases`, `r2_buckets` and `queues` blocks because bindings are not inherited.

## Secrets

Secrets are encrypted, never shown again, and are not in `wrangler.jsonc`.

```bash
npm run cf:secret -- CRON_SECRET        # recommended
npm run cf:secret -- SIGNING_SECRET     # optional; otherwise generated and kept in D1
npm run cf:secrets                      # list names (values are never shown)
```

Full list in [configuration.md](configuration.md).

## Deploy

```bash
npm run deploy
```

which runs, in order:

1. `npm run build`: `scripts/migrations.mjs` (keeps `migrations/` in sync), then `vite build` into `dist/`.
2. `npm run db:migrate:remote`: `wrangler d1 migrations apply DB --remote` applies any migration not yet listed in the `d1_migrations` table. Migrations run **before** the new code is live, so new code never meets an old schema.
3. `wrangler deploy`: uploads the script and changed assets, and updates the cron trigger and queue consumer.

### Dry run

```bash
npm run deploy:dry
```

Bundles the Worker into `.wrangler/dry-run/` without uploading. Useful to check bundle size or review what would ship.

### Preview a version before it goes live

```bash
npm run build
npx wrangler versions upload            # uploads a version without serving it
npx wrangler versions deploy            # pick the version (and optionally a % rollout)
```

`wrangler.jsonc` ships with `"preview_urls": false`, so `versions upload` does not publish a public URL for the version. Preview URLs would use the **production** D1 and R2 bindings, so turn them on (`"preview_urls": true`) only if you accept treating each uploaded version as production.

Note that `versions upload` does not apply migrations; run `npm run db:migrate:remote` first if the version needs a schema change. Keep migrations additive (new tables and columns) so the old version keeps working while both run side by side.

### Gradual rollout

`npx wrangler versions deploy` lets you send, say, 10% of traffic to the new version and the rest to the current one, then raise it. See [operations.md](operations.md#rollbacks).

## After deploying

- `https://pos.<subdomain>.workers.dev/api/health` → `{"ok":true}`
- Dashboard → **Workers & Pages → pos**: Settings shows bindings, Triggers shows the cron, Observability shows logs.
- `npm run cf:tail` streams live logs.
- Run the daily cycle once by hand to check it (see [cron-and-queues.md](cron-and-queues.md#run-it-by-hand)).

## Removing it

```bash
npx wrangler delete pos                 # the Worker
npx wrangler d1 delete pos              # the database: all data, permanently. Back up first (npm run cf:backup).
npx wrangler r2 bucket delete pos-photos  # must be empty first
npx wrangler queues delete pos-daily
```
