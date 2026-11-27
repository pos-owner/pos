# Deploy to Cloudflare Pages by drag and drop

Use this when whoever runs pOS on Cloudflare does not want a terminal. You build one zip once (or whenever the code changes) and upload it in the dashboard. The database creates itself on the first request.

The trade-offs compared with the Workers method:

- Pages has no Cron Triggers or Queues, so the daily rent cycle needs a tiny second Worker (step 6).
- Bindings are set by clicking in the dashboard rather than in `wrangler.jsonc`.
- Rollbacks are per deployment in the Pages dashboard, and migrations run on first request rather than before deploy.

## 1. Build the zip

On any machine with Node.js:

```bash
npm install
npm run pages:bundle
```

This writes **`pos-upload.zip`** containing the PWA, `_worker.js` (the whole API in one file, from `worker/pages-entry.ts`), `_routes.json` (only `/api/*` runs the Worker) and `_headers`. Hand the zip to whoever deploys.

## 2. Create the database and bucket

In the Cloudflare dashboard:

1. **Storage & Databases → D1 SQL Database → Create**. Name it `pos`. Leave it empty: no SQL needed.
2. **R2 Object Storage → Create bucket**. Name it `pos-photos`. Keep it **private** (no public access, no custom domain).

## 3. Create the Pages project

1. **Workers & Pages → Create → Pages → Upload assets**.
2. Project name: `pos` (your address becomes `https://pos.pages.dev`, or a variant if taken).
3. Upload `pos-upload.zip` and **Deploy**.

## 4. Connect the bindings

Project → **Settings → Bindings → Add**, for the **Production** environment:

| Type | Variable name | Value |
| --- | --- | --- |
| D1 database | `DB` | `pos` |
| R2 bucket | `PHOTOS` | `pos-photos` |
| Workers AI | `AI` | (optional) meter-photo reading |

Then **Settings → Variables and Secrets**:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `CRON_SECRET` | a long random string; you need it again in step 6 |
| Text | `APP_URL` | `https://pos.pages.dev` (your address) |
| Text | `SIGNUPS` | `closed` once your own account exists (optional) |

Also under **Settings → Runtime**, set the **Compatibility date** to `2026-11-01` or later and add the **`nodejs_compat`** compatibility flag.

Bindings and variables only apply to **new** deployments: go to **Deployments**, open the latest one's menu and choose **Retry deployment** (or upload the zip again).

## 5. Check the setup

Open `https://pos.pages.dev/api/health`. The Pages build answers with a checklist:

```json
{ "ok": true, "schema": true, "db": true, "photos": true, "ai": true, "cronSecret": true }
```

| Field false | Fix |
| --- | --- |
| `db` | D1 binding missing or not named exactly `DB`; redeploy after adding |
| `photos` | R2 binding missing or not named exactly `PHOTOS` |
| `schema` | The database could not be migrated; see the deployment's **Functions** logs |
| `ai` | Optional. Add the Workers AI binding to read meter photos |
| `cronSecret` | Add the `CRON_SECRET` secret; the daily job cannot run without it |

`schema: true` means every migration has been applied. That happens automatically on the first API request after each upload (`worker/server/core/migrate.ts`).

## 6. Add the daily job

The rent cycle (monthly charges, late fees, reminders, push) needs a scheduled trigger, which Pages does not have. Create a small Worker for it:

1. **Workers & Pages → Create → Worker → Start with Hello World**. Name it `pos-daily-cron`, deploy, then **Edit code**.
2. Replace the code with the contents of [`cloudflare/cron-worker/index.js`](../../cloudflare/cron-worker/index.js) and **Deploy**.
3. Worker → **Settings → Variables and Secrets**: add text `APP_URL` = your Pages address (for example `https://pos.pages.dev`) and secret `CRON_SECRET` = the same value as in step 4.
4. Worker → **Settings → Trigger Events → Add → Cron Triggers**: `30 0 * * *` (06:00 IST).
5. Test it: **Settings → Trigger Events → your cron → Test**, or wait for the next run, then check the Worker's logs for `daily cycle: N workspace(s)…`.

With a terminal, the same Worker deploys with `npm run cron:deploy` after setting `APP_URL` in `cloudflare/cron-worker/wrangler.jsonc` (then `npx wrangler secret put CRON_SECRET -c cloudflare/cron-worker/wrangler.jsonc`).

The cron Worker handles up to about 45 workspaces per run on the Free plan (50 outgoing requests per invocation). Beyond that, use the Workers deployment, which fans out through a Queue.

## Updating

Run `npm run pages:bundle` again and, in the Pages project, **Create deployment → upload** the new zip. New migrations apply themselves on the first request.

## Moving to the Workers deployment later

Point `wrangler.jsonc` at the same D1 database (`database_id`) and R2 bucket. Wrangler keeps its own `d1_migrations` table and does not read the Pages build's `pos_migrations`, so without help the first `wrangler d1 migrations apply` would try to re-run every migration. Copy the records across once, then run `npm run deploy`:

```bash
npx wrangler d1 execute pos --remote --command "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL); INSERT OR IGNORE INTO d1_migrations (name) SELECT name FROM pos_migrations;"
```

The other direction (Workers → Pages) needs nothing: the Pages build recognises Wrangler's `d1_migrations` table.
