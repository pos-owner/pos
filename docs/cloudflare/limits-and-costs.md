# Limits and costs

pOS is designed to run on Cloudflare's **Workers Free** plan for small portfolios and to scale smoothly on **Workers Paid** (from $5/month per account). The figures below are Cloudflare's published allowances at the time of writing; always check the current pricing pages before relying on them.

## What uses what

| Activity | Workers | D1 | R2 | Other |
| --- | --- | --- | --- | --- |
| Opening the app, loading screens' code, icons | none (static assets are free) | — | — | — |
| Each API call | 1 request | a few to a few hundred rows read | — | — |
| Recording a payment | 1 request | a handful of rows written | — | — |
| Uploading a photo | 1 request | 1 row written | 1 write (Class A) | — |
| Viewing a photo | 1 request (then browser-cached 1 h) | — | 1 read (Class B) | — |
| Daily cycle | 1 cron + 1 queue invocation per batch of ≤10 workspaces | reads per workspace | — | Queue: ~3 operations per workspace |
| Meter scan | 1 request | — | 1 read | Workers AI Neurons |

PDFs are drawn in the browser, so they cost nothing on the Worker.

## Free plan allowances (approximate)

| Product | Free allowance |
| --- | --- |
| Workers | 100,000 requests/day, 10 ms CPU per request, 50 subrequests per request |
| Static assets | unlimited requests, free |
| D1 | 5 million rows read/day, 100,000 rows written/day, 5 GB total storage (500 MB per database) |
| R2 | 10 GB storage, 1 million Class A and 10 million Class B operations per month, no egress fees |
| Queues | included daily operations on Free (check the current figure) |
| Cron Triggers | 5 per account |
| Workers AI | 10,000 Neurons/day |
| Observability logs | a daily allowance of log events; older logs drop off after a few days |

A typical owner with 20–50 units and their tenants uses a small fraction of this.

## When to move to Workers Paid

- **CPU time:** the Free 10 ms CPU limit can be tight for large ledgers, reports, or a big backup export. If logs show `Exceeded CPU Limit`, upgrade; Paid allows far more CPU per request (and lets you set `limits.cpu_ms` in `wrangler.jsonc`).
- **D1 writes or size:** more than ~100,000 rows written per day, or a database approaching 500 MB.
- **Many workspaces on Pages:** the Pages cron Worker can only call ~45 workspaces per run on Free (50 subrequests). The Workers deployment avoids this by using the Queue.
- **Longer Time Travel:** 30 days instead of 7.

Paid includes generous monthly amounts (for example 10 million Worker requests and 25 billion D1 rows read) before usage billing starts.

## Keeping costs predictable

- Static assets never start the Worker (`run_worker_first: ["/api/*"]`), so most traffic is free.
- Hashed assets are cached for a year; photos are cached privately for an hour.
- Set `METER_AI=off` to stop Workers AI usage, or front it with AI Gateway rate limits.
- Under **Manage Account → Billing → Billable usage**, set up usage notifications.
- `observability.head_sampling_rate` in `wrangler.jsonc` (1 = every request) can be lowered, for example to `0.1`, if log volume grows.

## Hard limits to design around

| Limit | Where it matters | How pOS handles it |
| --- | --- | --- |
| 100 bound parameters per D1 statement | Large `IN (...)` lists | Inlined safely in `worker/db/index.ts` |
| No interactive D1 transactions | Money updates | Guarded single statements, `db.batch`, triggers |
| `sendBatch` ≤ 100 messages | Daily fan-out | Batched in `worker/index.ts` |
| 100 MB request body (Free) | Uploads | Photos capped at 6 MB |
| Static asset file size 25 MiB | Build output | The app is a few MB in total |
