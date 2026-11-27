# Troubleshooting

Start with `npm run cf:tail` for a Workers deployment or the Pages function logs. For a running site, `npm run smoke -- https://your-app.example` checks health, static assets and security headers.

## Setup and deployment

| Symptom | Check |
| --- | --- |
| Authentication or account selection error | Run `npm run cf:whoami`; check token permissions and `CLOUDFLARE_ACCOUNT_ID`. |
| D1 binding has an invalid id | Run `npm run cf:setup` or correct `database_id` in `wrangler.jsonc`. |
| Queue does not exist | Run `npm run cf:setup` before deploying Workers. |
| Static asset directory is missing | Run `npm run build`; `npm run deploy` does this automatically. |
| Migration failed | The Workers deployment stops before publishing new code. Inspect the migration and D1 state; see [D1](database-d1.md). |
| CI install fails on lockfile | Update and commit `package-lock.json` with `npm install`. |

## App behavior

| Symptom | Check |
| --- | --- |
| `/api/health` is unhealthy | Confirm the `DB` binding and inspect D1/Worker logs. On Pages, also check `schema` in the response. |
| `/api/*` returns a static page or 404 | Check Workers `assets.run_worker_first` or Pages `_routes.json`; rebuild the Pages bundle. |
| API says setup is unfinished on Pages | Add the D1 binding with the exact name `DB`, then redeploy. |
| Deep link returns 404 | Check SPA fallback and ensure a Pages `404.html` is not overriding it. |
| Signed photo link fails | Refresh to get a new link; confirm the signing secret was not changed between deployments. |
| Photo upload is rejected | Check that it is JPEG, PNG or WebP and at most 1,200,000 bytes. |
| Meter photo scan is unavailable | Check the `AI` binding and `METER_AI`; local development omits AI by default. |
| Reset screen says email is unavailable | Email is optional; use an owner-generated reset link or configure the Email binding. |
| API returns 429 | A rate limit was reached; wait for its window to expire. |

## Daily processing

| Symptom | Check |
| --- | --- |
| Rent charges were not created | Confirm the Cron Trigger and review the daily-cycle logs. |
| Cron ran but workspace work is missing | Confirm the Workers Queue consumer is configured and the queue has no stuck failures. |
| Manual daily endpoint returns 403 | Confirm `CRON_SECRET` and the `x-cron-secret` header match. |
| Pages scheduler reports missing variables | Set matching `APP_URL` and `CRON_SECRET` on the Pages app and companion Worker. |
| Pages does not process every workspace | The helper caps one run at 45 workspaces; move to Workers Queue processing for larger portfolios. |

For local problems, see [local development](local-development.md).
