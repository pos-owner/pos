# Operations

Day-two tasks for a running pOS: watching it, rolling back, backing up, and getting people back in.

## Health

| Check | Expected |
| --- | --- |
| `GET /api/health` | `{"ok":true}` (Pages: a checklist of bindings, see [deploy-pages-upload.md](deploy-pages-upload.md#5-check-the-setup)) |
| Dashboard → Workers & Pages → pos → **Metrics** | Requests, errors, CPU time |
| Dashboard → Queues → pos-daily | Messages in, acked, retried |
| Dashboard → D1 → pos → **Metrics** | Rows read/written, database size |

For outside monitoring, point any uptime checker at `/api/health`. It touches the Worker but not the database (on Workers), so it is cheap to poll.

## Logs

```bash
npm run cf:tail                                # live, pretty-printed
npx wrangler tail --status error               # only failed invocations
npx wrangler tail --search "daily cycle"       # only lines containing a string
```

Past logs: dashboard → pos → **Observability** (enabled in `wrangler.jsonc`). Search by message, status or path, and open a request to see its console output and timings.

What to look for:

| Log line | Meaning |
| --- | --- |
| `daily cycle queued N workspaces, pruned M` | The cron ran and fanned out |
| `daily cycle <ownerId> {...}` | One workspace finished; counts of charges, fees, alerts, pushes |
| `daily cycle failed for a workspace; retrying` | It will retry in 5 minutes |
| `daily step <name> failed` | One step failed; the others still ran |
| `reset email failed` | The EMAIL binding refused a message ([email.md](email.md)) |

## Deploys

```bash
npx wrangler deployments list        # what is live, and when it went out
npx wrangler versions list           # every uploaded version
```

## Rollbacks

```bash
npm run cf:rollback                  # back to the previous version (asks for a reason)
npx wrangler rollback <version-id>   # to a specific one
```

Rollbacks are instant and only change code and static assets. They do **not** undo D1 migrations, which is why migrations are kept additive (old code keeps working on the new schema). If a migration itself was the problem, fix it forward with a new migration, or restore with Time Travel ([database-d1.md](database-d1.md#time-travel-point-in-time-restore)).

### Gradual rollout

```bash
npm run build && npx wrangler versions upload
npx wrangler versions deploy         # choose e.g. 10% new / 90% current, then raise it
```

Pages: Deployments → pick an older deployment → **Rollback to this deployment**.

## Backups

```bash
npm run cf:backup                    # SQL export of production D1 into backups/
```

Schedule it (for example weekly from your machine or a CI job) and keep copies off Cloudflare. D1 Time Travel covers the last 7 days (Free) or 30 days (Paid) on its own. Photos are in R2; see [storage-r2.md](storage-r2.md#backing-up-photos). Each owner can also download their own workspace as JSON in **More → Export & backup**.

## Emergency password reset

When someone cannot get in and email is not configured (typically an owner who forgot their own password):

```bash
npm run cf:reset-link -- owner@example.com --url https://pos.example.com
```

The script writes a one-time link straight into D1, valid for one hour; any earlier unused links for that person stop working. Only a SHA-256 hash of the token is stored. Send the printed link to the person over a channel you trust.

Owners reset their staff and tenants themselves from the person's page (**Password help**), no terminal needed.

## Signing everyone out

Each person can sign out all their devices from **Settings → Security → Signed-in devices**. To sign out everyone (for example after a suspected leak):

```bash
npx wrangler d1 execute DB --remote --command "DELETE FROM sessions"
```

## Rotating secrets

| Secret | How | Side effect |
| --- | --- | --- |
| `CRON_SECRET` | `npm run cf:secret -- CRON_SECRET`; update the cron Worker too on Pages | None |
| `SIGNING_SECRET` | `npm run cf:secret -- SIGNING_SECRET` | Photo links already on screen stop loading until the page refreshes |
| `VAPID_*` | Set both new keys | Devices resubscribe when they next open the app |
| API token (CI) | Roll it in the dashboard, update the GitHub secret | None |

Secrets take effect on the next request; no redeploy needed.

## Closing sign-ups

```jsonc
"vars": { "SIGNUPS": "closed" }
```

then `npm run deploy`. Existing accounts and invitations keep working.

## Moving to another Cloudflare account

1. `npm run cf:backup` on the old account; copy photos out of R2 (S3 API or rclone).
2. Log in to the new account, `npm run cf:setup` (reset `database_id` to the zero placeholder first), import the SQL with `npx wrangler d1 execute DB --remote --file <backup.sql>`, copy photos into the new bucket.
3. Set the secrets again (`SIGNING_SECRET` and `VAPID_*` are also stored in D1 if they were generated, so they move with the backup).
4. `npm run deploy`, then move the custom domain.

The export includes the `d1_migrations` table, so `npm run deploy` on the new account does not re-run migrations that are already applied.
