# Cron Triggers and Queues

The daily job processes each owner workspace: it creates due rent charges, ends tenancies past their end date, records reminder information, applies late fees, generates recurring expenses, raises lease alerts and sends pending pushes. It also prunes expired sessions, password-reset records and rate-limit entries.

## Workers deployment

`wrangler.jsonc` schedules the Worker at `30 0 * * *` (00:30 UTC / 06:00 IST). The scheduled handler sends one message per owner to `DAILY_QUEUE`, in batches of at most 100. The consumer processes messages in batches of up to 10 and retries a failed workspace after five minutes, up to the configured retry limit. Each daily step logs its own error and later independent steps can continue.

Without a Queue binding, the scheduled handler runs the work inline. For a larger portfolio, keep the Queue enabled so work is spread across invocations.

## Pages deployment

Pages has no Cron Trigger or Queue consumer. Deploy `cloudflare/cron-worker/index.js` as a separate Worker, configure its `APP_URL` and `CRON_SECRET`, and add the same `30 0 * * *` schedule. It calls the API in three phases: list workspaces, process each workspace, and prune expired records. The helper handles up to 45 workspaces in one run; use Workers for larger workloads.

See [Pages deployment](deploy-pages-upload.md) for setup steps.

## Manual run

The protected endpoint requires `CRON_SECRET`:

```bash
curl -X POST "https://pos.example.com/api/cron/daily" \
  -H "x-cron-secret: $CRON_SECRET"
```

The Pages scheduler uses `?list=1`, `?owner=<id>` and `?prune=1` to run the phases separately. Do not expose the secret in shell history or logs.

Locally, run Wrangler with `--test-scheduled` and request `/__scheduled?cron=30+0+*+*+*`, or call the API with the local secret. Check `npm run cf:tail` and the Queue metrics when diagnosing failures.
