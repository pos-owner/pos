# Limits and cost planning

Cloudflare plan limits, pricing and product quotas change. Use this guide for the workload shape and check Cloudflare's current pricing and limits before making a capacity or budget commitment.

## What creates usage

| Activity | Main resource use |
| --- | --- |
| Loading the PWA | Static asset delivery; normally does not invoke the Worker |
| API request | Worker request and D1 reads or writes |
| Photo upload and display | D1 storage and reads; images are returned through signed API routes |
| Daily job | Cron invocation, queue operations and per-workspace database work |
| Meter-photo scan | Worker request and Workers AI usage |
| PDF export | PDF generation in the browser, not a server-side PDF job |

## Capacity controls

- Keep static assets separate from API requests; `assets.run_worker_first` is limited to `/api/*`.
- Photos are capped at 1,200,000 bytes and stored in D1, so include them in database-size planning.
- The Workers daily job uses queue fan-out. The Pages helper processes at most 45 workspaces per scheduled run.
- Meter AI is optional and can be disabled with `METER_AI=off`.
- Use `npm run cf:backup` for independent backups; D1 exports include photo data.

## Runtime constraints

D1 uses SQLite semantics, has a per-statement bound-parameter limit and does not support interactive transactions. The code uses batches, guarded updates and triggers for consistency-sensitive writes. Worker CPU, request, Queue, D1 and AI quotas depend on the Cloudflare plan; inspect account usage and the current Cloudflare limits pages rather than relying on old figures.

If the app approaches a quota, identify the endpoint or scheduled workload in Observability and D1 metrics before changing plans. Reduce unnecessary sampling or disable optional AI only when appropriate; do not remove data-integrity checks to reduce usage.
