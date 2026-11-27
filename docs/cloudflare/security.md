# Security

What protects pOS on Cloudflare, and what you are responsible for.

## In transit

- Everything is HTTPS (`workers.dev`, `pages.dev` and custom domains all get certificates automatically).
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` is sent for every static file (`public/_headers`). See [custom-domain.md](custom-domain.md#security-headers-and-hsts) before using it on a shared domain.

## Headers

| Where | Headers |
| --- | --- |
| Static files (`public/_headers`) | `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy: camera=(self), geolocation=()`, HSTS, long-lived caching for hashed assets only |
| API responses (`worker/server/core/secure.ts`) | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cache-Control: no-store` unless a route sets its own |

The CSP allows scripts only from the app's own origin (`script-src 'self'`), no plugins, and no framing. Inline styles are allowed for the launch screen.

## Sessions

- Cookie: `HttpOnly`, `Secure` (on HTTPS), `SameSite=Lax`, 30 days, refreshed on use. Session tokens are random and only their hash is stored in D1.
- The API is same-origin only; there is no CORS, so other sites cannot call it with a user's cookie.
- People see and revoke their own devices (Settings → Security → Signed-in devices), with an approximate location from Cloudflare's IP geolocation.
- Passwords are stretched with PBKDF2 in the browser (`shared/loginKey.ts`) and hashed again with PBKDF2-SHA256 and a random salt in the Worker (`worker/server/core/password.ts`); invite PINs are hashed too.

## Access control

Every route declares who may call it (`roles("owner")`, `roles("owner", "tenant")`, …) and data is always scoped to the caller's workspace. Fine-grained rules (who may read a ledger, a request, a tenant) are in `worker/server/core/access.ts` and covered by `tests/unit/access.test.ts` and the API tests.

## Abuse protection

- Rate limits on sign-in, sign-up, password changes and resets, invite PINs and claims, photo uploads, meter scans, receipt verification and backups (`worker/server/core/rateLimit.ts`), stored in D1 so they hold across all Worker instances. If the database cannot be reached, requests are denied rather than let through.
- Uploads are capped at 6 MB and their type is checked from the file's bytes.
- For extra protection on a custom domain, add Cloudflare **WAF rate limiting rules** for `/api/auth/*` or turn on **Bot Fight Mode** on the zone. Turnstile is not built in.

## Data at rest

- D1 and R2 encrypt data at rest.
- The photo bucket is private; photos are only reachable through short-lived signed links.
- Personal data stored: names, emails, phone numbers, addresses, optionally PAN, payment records and photos. Treat `backups/` and exports accordingly; they are git-ignored for that reason.

## Secrets

- Never put secrets in `wrangler.jsonc`, `.dev.vars.example`, or git. Use `npm run cf:secret -- NAME` (encrypted, write-only).
- `.dev.vars` is git-ignored and only for local development.
- Generated secrets (photo signing key, VAPID key pair) are stored in the D1 `app_secrets` table if you do not set them, which means a D1 export contains them. Set them as Worker secrets if that matters to you.

## Cloudflare account

- Turn on two-factor authentication for every account member.
- CI uses an API token scoped to one account with only the permissions in [deploy-github-actions.md](deploy-github-actions.md#1-create-an-api-token). Give it an expiry and roll it when people leave.
- Add teammates with the narrowest role (for example **Workers Admin** rather than Super Administrator).
- `CRON_SECRET` protects the only endpoint that is not tied to a signed-in user; use a long random value.

## Reporting a problem

If you find a vulnerability, contact the maintainers privately rather than opening a public issue.
