# Deploy to Cloudflare Pages by upload

Use this deployment when the project owner prefers dashboard asset uploads. Pages runs the API through an advanced-mode Worker, but it does not provide the Cron Trigger or Queue used by the Workers deployment. A separate small Worker is required for daily processing.

## Build the upload

On a machine with Node.js and the project dependencies:

```bash
npm ci
npm run pages:bundle
```

The command builds the app and creates `pos-upload.zip`. Its root contains the static site, `dist/_worker.js` (bundled from `worker/pages-entry.ts`), and `_routes.json` (only `/api/*` invokes the Worker).

## Create and configure the Pages project

1. In Cloudflare, create a Pages project using **Upload assets** and upload `pos-upload.zip`.
2. Create a D1 database named `pos` (or choose another name and bind it as `DB`).
3. Under the production environment's **Settings → Bindings**, add D1 as `DB`. Optionally add Workers AI as `AI`.
4. Under **Variables and Secrets**, set `CRON_SECRET` and `APP_URL`. Set `SIGNUPS=closed` after creating the intended owner accounts if open owner registration is not wanted.
5. Set compatibility date `2026-11-01` or later and enable `nodejs_compat`.
6. Redeploy after adding or changing bindings.

Photos use the D1 `photo_data` table. No R2 bucket is needed.

## Check setup and migrations

Open `/api/health`. Pages returns setup information including `db`, `schema`, `ai` and `cronSecret`. `db` and `schema` must be true for the API to be ready; AI is optional. The first API request creates or updates the schema using embedded migrations. Check Pages function logs if migration setup fails.

## Add the daily scheduler

Deploy `cloudflare/cron-worker/index.js` as a separate Worker, then set its `APP_URL` to the Pages origin and its `CRON_SECRET` to the same value configured on Pages. Add Cron Trigger `30 0 * * *` (06:00 IST). Alternatively, set the URL in `cloudflare/cron-worker/wrangler.jsonc` and use `npm run cron:deploy`, then set the secret on that Worker.

The helper processes at most 45 workspaces in one run to stay within the Pages cron Worker's request budget. If the deployment outgrows that limit, prefer the Workers deployment with Queue fan-out.

## Update and switch deployment targets

To update, rebuild `pos-upload.zip` and upload a new Pages deployment. Pages applies pending migrations on its next API request.

Before switching from Pages to Workers, ensure Wrangler's `d1_migrations` table records the migrations already applied by Pages. The Pages migration runner recognizes Wrangler's table, but Wrangler does not automatically use `pos_migrations`. Follow the migration-state transfer procedure in [D1 documentation](database-d1.md#switching-between-pages-and-workers) before running remote migrations.
