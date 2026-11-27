# Production readiness checklist

Use this checklist before real owners, staff or tenants rely on the deployment.

## Account and resources

- [ ] Enable two-factor authentication for Cloudflare account members.
- [ ] Create the D1 database and `pos-daily` queue for Workers, or D1 for Pages.
- [ ] Confirm D1's location before creating a production database.
- [ ] Set a billing or usage alert appropriate to the account.

## Configuration

- [ ] Set a strong `CRON_SECRET`; on Pages, set the same value on the companion cron Worker.
- [ ] Set `APP_URL` to the public address when using a custom domain.
- [ ] Close owner sign-ups with `SIGNUPS=closed` if public workspace creation is not intended.
- [ ] Decide whether meter-photo AI and email are enabled.
- [ ] Confirm no secrets are present in configuration files or git history.

## Deploy and verify

- [ ] `npm run verify` passes.
- [ ] Deployment completes and all intended D1 migrations are applied.
- [ ] `/api/health` reports a healthy database.
- [ ] Workers shows the expected `30 0 * * *` trigger and queue consumer, or the Pages companion Cron Trigger is active.
- [ ] Observability logs are available.
- [ ] Run `npm run smoke -- https://your-app.example` after deployment.

## Product and recovery

- [ ] Test owner onboarding, property/unit creation and invitation acceptance.
- [ ] Test a tenant payment claim and owner confirmation; verify the receipt.
- [ ] Test a maintenance photo upload and access from the appropriate roles.
- [ ] Test push notifications and the installed app on a target device.
- [ ] Take a D1 backup and store it outside Cloudflare.
- [ ] Document who can deploy, restore, rotate secrets and create emergency reset links.

For a custom domain, also review the HSTS notes in [custom-domain](custom-domain.md).
