# Troubleshooting

Find the message or symptom, apply the fix. For anything not listed, `npm run cf:tail` while reproducing the problem usually shows the cause.

## Setup and deploy

| Message / symptom | Cause and fix |
| --- | --- |
| `You are not authenticated` / `Not logged in` | `npm run cf:login`, or set `CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID`) |
| `More than one account available` | Set `CLOUDFLARE_ACCOUNT_ID` to the account you want |
| `Please enable R2 through the Cloudflare Dashboard` | Dashboard → R2 Object Storage → enable once, then `npm run cf:setup` again |
| `Couldn't create D1 "pos"` | Name already used in another account you can see, or token lacks D1 Edit. Change `database_name` or fix the token |
| `binding DB of type d1 must have a valid id` | `database_id` is still the zero placeholder: run `npm run cf:setup` |
| `Queue "pos-daily" does not exist` | Run `npm run cf:setup` (it creates the queue) before `wrangler deploy` |
| `The directory specified by the "assets.directory" field ... does not exist` | Run `npm run build` first (`npm run deploy` does) |
| `A request to the Cloudflare API ... failed ... code 10021` / script validation error | Usually a runtime import problem; run `npm run deploy:dry` locally to see the bundling error |
| Migration fails during `npm run deploy` | The Worker was not deployed; the old version is still live. See [database-d1.md](database-d1.md#when-a-migration-fails) |
| `Your Worker exceeded the size limit` | Check `npm run deploy:dry` output size; the API bundle is normally well under the Free 3 MB limit |
| GitHub Actions: `npm ci` lockfile error | `npm install` locally and commit `package-lock.json` |

## Running app

| Symptom | Cause and fix |
| --- | --- |
| App loads but every action fails, `/api/health` 404s | The Worker is not handling `/api/*`. On Workers, check `assets.run_worker_first` in `wrangler.jsonc`. On Pages, the zip lacks `_worker.js`: rebuild with `npm run pages:bundle` |
| `/api/...` returns `503 Setup is not finished` | Pages only: D1 (`DB`) or R2 (`PHOTOS`) binding missing. Add it and **redeploy** |
| `The database could not be set up` | Pages only: a migration failed on first request. Open `/api/health` and the deployment's logs |
| `no such table: ...` | Workers: migrations not applied to this database. `npm run db:migrate:remote` |
| Reloading `/tenants/42` shows a 404 | SPA fallback off. Workers: `not_found_handling: "single-page-application"`. Pages: make sure there is no `404.html` in `dist/` |
| Signed out on every visit | Mixing addresses (workers.dev vs custom domain): the cookie is per host. Use one address; set `APP_URL` to it |
| Photos show "Link expired" | Signed links are short-lived; refresh the screen. If it persists, `SIGNING_SECRET` changed between instances; set it once as a secret |
| Photos fail to upload | Over 6 MB, or not JPEG/PNG/WebP. Check R2 binding on Pages |
| Meter scan unavailable | No `AI` binding, or `METER_AI=off` ([workers-ai.md](workers-ai.md)) |
| "Forgot password?" says email isn't set up | Expected without email; use reset links ([email.md](email.md)) |
| Old version keeps showing after deploy | The service worker updates in the background; close and reopen the app (installed) or reload twice |
| `Exceeded CPU Limit` in logs | Free plan 10 ms CPU; see [limits-and-costs.md](limits-and-costs.md#when-to-move-to-workers-paid) |
| `429 Too many attempts` | Rate limit hit; wait for the window (minutes to an hour) |

## Daily cycle

| Symptom | Cause and fix |
| --- | --- |
| No new month's charges | Check Workers → pos → Triggers shows `30 0 * * *`; look for `daily cycle` in Observability. Run by hand ([cron-and-queues.md](cron-and-queues.md#run-it-by-hand)) |
| Cron runs but nothing per workspace | Queue consumer missing: `queues.consumers` in `wrangler.jsonc`, then deploy |
| Manual run answers `403 Forbidden` | `CRON_SECRET` not set, or header value differs |
| Pages cron Worker: `Set the APP_URL and CRON_SECRET variables` | Add both to the `pos-daily-cron` Worker |
| Pages cron Worker: `?list=1 -> 403` | `CRON_SECRET` differs between the Pages project and the cron Worker |
| Some workspaces skipped on Pages | More than ~45 workspaces: switch to the Workers deployment |

## Local development

See [local-development.md](local-development.md#common-local-problems).

## Getting more detail

```bash
npx wrangler tail --status error --format pretty
npx wrangler d1 execute DB --remote --command "SELECT * FROM d1_migrations"
npx wrangler deployments list
```

Dashboard → pos → **Observability** shows each request's logs, status and timing.
