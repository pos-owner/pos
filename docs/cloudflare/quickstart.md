# Quickstart: deploy pOS to Workers

You need a Cloudflare account, Node.js 22.18 or newer and this repository.

## 1. Install and authenticate

```bash
npm ci
npm run cf:login
npm run cf:whoami
```

If you use multiple Cloudflare accounts, set `CLOUDFLARE_ACCOUNT_ID` to select the intended account.

## 2. Create resources

```bash
npm run cf:setup
```

This safely creates or finds the D1 database and `pos-daily` queue declared in `wrangler.jsonc`. It writes a real D1 id when the config still has its placeholder. The default D1 location hint is `apac`; choose the location before creating a production database because it cannot be changed in place.

## 3. Set the cron secret and deploy

```bash
npm run cf:secret -- CRON_SECRET
npm run deploy
```

The secret protects manual daily-job requests. The configured Cron Trigger does not use it. Deployment builds the app, applies remote D1 migrations, then deploys the Worker.

## 4. Set up the first owner

Open `https://pos.<your-subdomain>.workers.dev`, create an owner account and complete onboarding. Check `https://pos.<your-subdomain>.workers.dev/api/health`; a healthy Workers response reports both `ok` and `db` as true.

Once the intended owner accounts exist, set `SIGNUPS` to `closed` in `wrangler.jsonc` and deploy again if public owner registration is not desired. Invitations for staff and tenants continue to work.

## 5. Prepare for real use

Review the [go-live checklist](deploy-checklist.md), set `APP_URL` when using a custom domain, and configure optional email or AI if needed. Photos are stored in D1, so this setup does not require an R2 bucket.

For automatic deployments, see [GitHub Actions](deploy-github-actions.md). To use dashboard uploads instead, follow [Pages deployment](deploy-pages-upload.md).
