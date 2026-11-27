# Deploy with Workers and Wrangler

Workers is the recommended production target. One Worker serves the app and API and runs the daily cycle with a Cron Trigger and Queue.

## Requirements and setup

Use Node.js 22.18+, install dependencies, and authenticate with `npm run cf:login` or a scoped `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`. Then run:

```bash
npm run cf:setup
npm run cf:secret -- CRON_SECRET
```

`cf:setup` creates or finds the D1 database and `pos-daily` queue named in `wrangler.jsonc`. D1 is created with the `apac` location hint by default; set `D1_LOCATION` when creating a new database in another supported region. Its location cannot be changed later.

## Deployment

```bash
npm run verify
npm run deploy
```

`npm run deploy` performs these steps in order:

1. `npm run build` synchronizes generated migrations and builds the PWA into `dist/`.
2. `wrangler d1 migrations apply DB --remote` applies pending schema changes.
3. `wrangler deploy` uploads the Worker and assets and updates its triggers and queue consumer.

If migration application fails, the new Worker is not deployed. Fix the issue with a new migration rather than editing a migration already applied in production.

## Dry runs and versions

`npm run deploy:dry` builds the app and bundles the Worker without publishing it. It is included in `npm run verify` and CI.

For version-based rollout, build first, then use `npx wrangler versions upload` and `npx wrangler versions deploy`. The repository sets `preview_urls` to false because uploaded versions can use production bindings. Apply required migrations before deploying a version that depends on them.

## Configuration and follow-up

Bindings and non-secret settings are in `wrangler.jsonc`; use `npm run cf:secret -- NAME` for secret values. See [configuration](configuration.md). After deploy, check `/api/health`, inspect Worker logs and verify the Cron Trigger and queue consumer in the dashboard. The [operations guide](operations.md) covers smoke checks and rollback.

Do not use `npm run deploy` to test against a production database unless that deployment is intended. Use `npm run deploy:dry` for a no-upload build check.
