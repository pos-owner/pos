# The daily rent cycle: Cron Triggers and Queues

Once a day pOS goes through every workspace and:

1. creates the month's rent charges and ends tenancies that have finished,
2. queues rent reminders,
3. applies late fees,
4. generates recurring expenses,
5. raises lease-ending alerts,
6. sends pending Web Push notifications,

and, across the whole app, deletes expired sessions, used or expired reset links and old rate-limit counters.

The code is `runDailyForOwner` and `runDailyCycle` in `worker/server/toolRoutes.ts`. The steps are written to be safe to re-run: charges, fees and recurring expenses are keyed by month, so running the cycle twice on the same day does not create them twice.

## On the Workers deployment

```
30 0 * * * (06:00 IST)
   └─ scheduled()                     worker/index.ts
        ├─ list owner workspaces
        ├─ DAILY_QUEUE.sendBatch      up to 100 messages per call, one per workspace
        └─ prune expired sessions etc.

pos-daily queue
   └─ queue()                         batches of up to 10 messages
        ├─ runDailyForOwner(ownerId) → ack
        └─ on error → retry in 5 minutes (max 5 attempts)
```

Each workspace succeeds or retries on its own, and the work spreads over many short invocations instead of one long one.

Both parts are configured in `wrangler.jsonc`:

```jsonc
"queues": {
  "producers": [{ "binding": "DAILY_QUEUE", "queue": "pos-daily" }],
  "consumers": [{ "queue": "pos-daily", "max_batch_size": 10, "max_batch_timeout": 5, "max_retries": 5 }]
},
"triggers": { "crons": ["30 0 * * *"] }
```

### Without a queue

Remove the `queues` block and the cron runs the whole cycle inline. That is fine for a handful of workspaces.

### Changing the time

Cron times are UTC. 06:00 IST is 00:30 UTC. Edit `triggers.crons` and deploy. Cloudflare may start a cron a little late under load; nothing in the cycle depends on the exact minute.

### Dead letters

After 5 failed attempts a message is dropped. To keep failures for inspection, create a dead-letter queue and point the consumer at it:

```bash
npx wrangler queues create pos-daily-dlq
```

```jsonc
"consumers": [{ "queue": "pos-daily", "max_batch_size": 10, "max_retries": 5, "dead_letter_queue": "pos-daily-dlq" }]
```

A failed workspace catches up on the next day's run, because each step looks at everything still outstanding, not just today.

## On the Pages deployment

Pages has neither Cron Triggers nor Queues. The companion Worker in `cloudflare/cron-worker/` runs on a Cron Trigger and calls the API step by step:

```
POST /api/cron/daily?list=1           → { owners: [...] }
POST /api/cron/daily?owner=<id>       → one workspace     (repeated, up to ~45)
POST /api/cron/daily?prune=1          → housekeeping
```

Setup is in [deploy-pages-upload.md](deploy-pages-upload.md#6-add-the-daily-job).

## Run it by hand

Any deployment, as long as `CRON_SECRET` is set:

```bash
curl -X POST "https://pos.<subdomain>.workers.dev/api/cron/daily" \
  -H "x-cron-secret: $CRON_SECRET"
```

Answers with what it did, for example `{"ok":true,"workspaces":3,"failedOwners":0,"created":12,"ended":0,"pruned":40}`. Without the header, or with the wrong value, it answers `403`.

You can also trigger the scheduled handler itself from the dashboard (Workers → pos → Settings → Triggers → Cron → **Test**), or locally:

```bash
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=30+0+*+*+*"
```

## Watching it

```bash
npm run cf:tail
```

Look for `daily cycle queued N workspaces, pruned M` from the cron, then one `daily cycle <ownerId> {...}` line per workspace from the queue. Past runs are under Workers → pos → **Observability** and the queue's metrics under **Queues → pos-daily**. Owners see the automation history in the app (**More → Automations**).
