# Custom domain

By default pOS lives at `https://pos.<your-subdomain>.workers.dev`. To serve it from your own domain, for example `pos.example.com`:

## Requirements

The domain (`example.com`) must be a zone on your Cloudflare account, with Cloudflare as its DNS. Adding a zone is free: dashboard → **Add a domain**, then change the nameservers at your registrar.

## Workers deployment

1. In `wrangler.jsonc`, add (uncomment at the bottom):

   ```jsonc
   "routes": [{ "pattern": "pos.example.com", "custom_domain": true }]
   ```

   Cloudflare creates the DNS record and the TLS certificate for you. Do not create a DNS record for `pos` yourself first; if one exists, delete it.

2. Tell the app its public address (used in reset links and push):

   ```jsonc
   "vars": { "APP_URL": "https://pos.example.com", ... }
   ```

3. `npm run deploy`. The certificate is usually ready within a few minutes.

4. Once `https://pos.example.com` works, optionally stop serving on `workers.dev`:

   ```jsonc
   "workers_dev": false
   ```

   and deploy again. (Sessions are per domain, so people signed in on the `workers.dev` address will need to sign in once on the new one. Installed apps should be re-installed from the new address.)

Alternatively: dashboard → Workers & Pages → pos → **Settings → Domains & Routes → Add → Custom domain**. If you do it in the dashboard, also add it to `wrangler.jsonc`, otherwise the next `wrangler deploy` may remove it.

### Apex domain

`"pattern": "example.com"` works the same way for the bare domain.

### Using a route instead

If something else already serves `example.com` and you want pOS on a path, a route such as `example.com/pos/*` is possible in principle, but the app expects to live at `/` (service worker scope, `/api`). Use a subdomain.

## Pages deployment

Pages project → **Custom domains → Set up a custom domain**, enter `pos.example.com` and follow the prompts. Then set `APP_URL` to the new address under Settings → Variables and redeploy, and update `APP_URL` on the `pos-daily-cron` Worker too.

## Security headers and HSTS

`public/_headers` sends `Strict-Transport-Security: max-age=31536000; includeSubDomains`. On a custom domain, this tells browsers to use HTTPS for **every subdomain** of the host for a year. That is usually what you want; if some sibling subdomain must stay on plain HTTP, remove `includeSubDomains` before going live.

Under the zone's **SSL/TLS** settings, use **Full (strict)** and enable **Always Use HTTPS**.

## Link previews

`index.html` uses a relative `og:image` (`/img/og.jpg`). Most apps (WhatsApp, Telegram, Slack) resolve it, but some crawlers require absolute URLs; with a custom domain, change it to `https://pos.example.com/img/og.jpg`.
