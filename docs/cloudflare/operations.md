# Operations

## Health and logs

On Workers, `GET /api/health` checks that D1 responds and reports `{ "ok": true, "db": true }` when healthy. On Pages, it also reports setup fields such as `schema`, `ai` and `cronSecret`. Use the deployment logs to investigate unhealthy responses.

```bash
npm run cf:tail
npx wrangler tail --status error
npx wrangler deployments list
npx wrangler versions list
```

For a read-only deployment check, run `npm run smoke -- https://your-app.example`. Do not use smoke's `--write` mode against production; it creates a test account.

## Backups and recovery

```bash
npm run cf:backup
```

The SQL export contains application data and photos. Store it securely outside Cloudflare and periodically verify that you can restore it. Owners can export their own workspace from **More → Export & backup**. See [D1 recovery](database-d1.md).

Worker code can be rolled back with `npm run cf:rollback` or `npx wrangler rollback <version-id>`. A code rollback does not undo D1 migrations; migrations should be additive. Pages deployments can be rolled back from the Pages dashboard.

## Emergency password reset

If email is unavailable and the owner cannot sign in, create a one-time reset link:

```bash
npm run cf:reset-link -- owner@example.com --url https://pos.example.com
```

The link is valid for one hour and can be used once. Share it through a trusted channel. Owners can create links for staff and tenants in the app.

## Incident response

- Revoke sessions from **Settings → Security → Signed-in devices**. To end every session, delete rows from `sessions` using a controlled D1 command.
- Rotate `CRON_SECRET` and update both the Pages app and companion scheduler when applicable.
- Rotating `SIGNING_SECRET` invalidates outstanding photo links; changing VAPID keys requires devices to resubscribe.
- If an incident involves data or migrations, preserve logs and backups before applying repairs.

## Move to another Cloudflare account

Export D1, create the destination resources, import into an empty D1 database, restore the binding and migration state, re-set Worker secrets, then deploy and verify. Photos are in D1 and are included in the export; no R2 object copy is involved. Keep the old deployment intact until the new one has passed verification.
