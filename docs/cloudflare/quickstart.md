# Quickstart: pOS live on Cloudflare in ten minutes

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and Node.js 22.18+ (24 recommended).

## 1. Install

```bash
npm install
```

## 2. Log in to Cloudflare

```bash
npm run cf:login
```

A browser window opens; approve access. Check it worked with `npm run cf:whoami`.

> If you have more than one Cloudflare account, set `CLOUDFLARE_ACCOUNT_ID` in your shell first so every command targets the right one.

## 3. Create the resources

```bash
npm run cf:setup
```

This creates, or finds if they already exist:

- the D1 database **`pos`**, and writes its id into `wrangler.jsonc`
- the R2 bucket **`pos-photos`**
- the queue **`pos-daily`**

R2 must be enabled once per account. If the script says R2 is not enabled, open **Cloudflare dashboard → R2 Object Storage**, accept the terms (the free tier needs no payment for this usage, but Cloudflare may ask for a card on file), and re-run the command.

Commit the changed `wrangler.jsonc` so everyone deploys to the same database.

## 4. Add the one secret you should set now

```bash
npm run cf:secret -- CRON_SECRET
```

Paste any long random string (for example from `openssl rand -base64 32`). It protects the manual daily-cycle endpoint. Everything else has a safe default; see [configuration.md](configuration.md).

## 5. Deploy

```bash
npm run deploy
```

This builds the app, applies every D1 migration to the production database, and deploys the Worker. The last lines print your address:

```
Deployed pos triggers
  https://pos.<your-subdomain>.workers.dev
  schedule: 30 0 * * *
  Consumer for pos-daily
```

## 6. Try it

1. Open `https://pos.<your-subdomain>.workers.dev/api/health`; it should answer `{"ok":true}`.
2. Open the address itself, choose **Create account** and set up your owner workspace.
3. Add a property and a unit, then invite a tenant from **More → Invites & people**.
4. On a phone, use **Add to Home Screen** to install it as an app.

## 7. Before you share it

- Close owner sign-ups if only you should own a workspace: set `"SIGNUPS": "closed"` in `wrangler.jsonc` and deploy again.
- Go through [deploy-checklist.md](deploy-checklist.md).
- Optionally attach your own domain ([custom-domain.md](custom-domain.md)) and set up password-reset emails ([email.md](email.md)).

## Next deploys

Every later change is just:

```bash
npm run deploy
```

Want this to happen on every push instead? See [deploy-github-actions.md](deploy-github-actions.md).
