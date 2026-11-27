# Go-live checklist

Tick these before real owners, staff and tenants use pOS.

## Cloudflare account

- [ ] Two-factor authentication on for every account member
- [ ] R2 enabled; D1 `pos`, R2 `pos-photos` and queue `pos-daily` exist (`npm run cf:setup`)
- [ ] Real `database_id` committed in `wrangler.jsonc`
- [ ] D1 was created in the right region (`apac` by default, see [database-d1.md](database-d1.md#where-the-database-lives)); it cannot be changed later
- [ ] Usage notifications set under Billing (optional but recommended)

## Configuration

- [ ] `CRON_SECRET` set as a secret (`npm run cf:secret -- CRON_SECRET`)
- [ ] `SIGNING_SECRET` set as a secret (optional; otherwise generated in D1)
- [ ] `APP_URL` set to the public address if you use a custom domain, and also set as a build variable so WhatsApp link previews get an absolute image URL
- [ ] `SIGNUPS` set to `closed` once your owner account exists, unless others should start workspaces
- [ ] `METER_AI` on or off as you intend
- [ ] Email configured, or the team knows how to make reset links ([email.md](email.md))
- [ ] Nothing secret in `wrangler.jsonc`, `.dev.vars.example` or git history

## Deploy

- [ ] `npm run verify` passes (types, tests, dry-run bundle)
- [ ] `npm run deploy` finished; `npm run db:list` shows every migration applied
- [ ] `npm run smoke -- https://your-address` passes (`GET /api/health` → `{"ok":true,"db":true}`; it returns 503 if D1 is unreachable, so point an uptime monitor at it)
- [ ] Workers → pos → Triggers shows the cron `30 0 * * *` and the queue consumer
- [ ] Observability enabled and showing requests

## Domain (if custom)

- [ ] `https://pos.example.com` loads with a valid certificate
- [ ] SSL/TLS mode **Full (strict)**, **Always Use HTTPS** on
- [ ] HSTS `includeSubDomains` is acceptable for this domain ([custom-domain.md](custom-domain.md#security-headers-and-hsts))
- [ ] `workers_dev: false` once the domain works (optional)

## Smoke test in the app

- [ ] Create an account, finish onboarding (try sample data on a test account)
- [ ] Add a property and unit; invite a tenant; accept the invite on another device
- [ ] Tenant marks a payment as paid; owner confirms it; receipt PDF opens
- [ ] Upload a request photo; it shows for both owner and tenant
- [ ] Turn on notifications and send a test from Settings
- [ ] Install the app on a phone (Add to Home Screen) and open it offline
- [ ] Run the daily cycle once by hand and check the log line ([cron-and-queues.md](cron-and-queues.md#run-it-by-hand))

## Operations

- [ ] First backup taken (`npm run cf:backup`) and stored somewhere safe
- [ ] A reminder to back up regularly
- [ ] Someone knows how to roll back (`npm run cf:rollback`) and make an emergency reset link
- [ ] If using GitHub Actions: secrets set, `production` environment reviewers configured (optional)
