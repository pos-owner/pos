# Configuration reference

Everything pOS reads from Cloudflare, in one place. On the Workers deployment, bindings and plain variables live in `wrangler.jsonc` and secrets are set with `npm run cf:secret -- NAME`. On Pages, all of them are set in the project's **Settings**.

Code reads bindings through `bindings()` (`worker/server/core/bindings.ts`) and text settings through `env("NAME")` (`worker/server/core/env.ts`), which trims values and treats empty strings as unset.

## Bindings

| Binding | Type | Required | Default name | Used for |
| --- | --- | --- | --- | --- |
| `DB` | D1 database | **yes** | `pos` | Every table |
| `PHOTOS` | R2 bucket | **yes** | `pos-photos` | Photos and cached report data |
| `ASSETS` | Static assets | Workers: yes (automatic) | `./dist` | The PWA |
| `AI` | Workers AI | no | — | Reading meter photos |
| `DAILY_QUEUE` | Queue producer | no | `pos-daily` | Fanning the daily cycle out per workspace |
| `EMAIL` | Send Email | no | — | "Forgot password?" emails |

The queue also needs a **consumer** entry for the same queue (already in `wrangler.jsonc`) so the Worker's `queue` handler receives the messages.

## Plain-text variables

Put these in `wrangler.jsonc` → `vars` (Workers) or Settings → Variables (Pages).

| Name | Default | Values | Effect |
| --- | --- | --- | --- |
| `SIGNUPS` | `open` | `open`, `closed` | `closed` stops brand-new owner sign-ups. Invited staff and tenants can always create an account. |
| `APP_URL` | origin of the request | `https://pos.example.com` | Public address used in password-reset emails, and as the Web Push contact if `VAPID_SUBJECT` is unset. Set it when you use a custom domain. Also read at **build** time (shell or GitHub variable) to make the link-preview image address absolute, which WhatsApp needs. |
| `EMAIL_FROM` | — | `no-reply@example.com` | Sender address for reset emails (a bare address on a domain set up for Email in your account). Needs the `EMAIL` binding. |
| `METER_AI` | on | `off` | `off` hides the meter-photo reader even when `AI` is bound. |
| `METER_AI_MODEL` | `@cf/meta/llama-4-scout-17b-16e-instruct` | any Workers AI vision model | Model that reads meter photos. |
| `VAPID_SUBJECT` | `APP_URL` | `mailto:you@example.com` or `https://…` | Contact sent to push services. |

## Secrets

Set with `npm run cf:secret -- NAME` (Workers) or as an encrypted variable (Pages). Never put these in `wrangler.jsonc` or git.

| Name | Required | If unset | Notes |
| --- | --- | --- | --- |
| `CRON_SECRET` | recommended (Pages: **yes**) | `POST /api/cron/daily` always answers 403 | Header `x-cron-secret` must match. The Workers Cron Trigger does not need it. |
| `SIGNING_SECRET` | no | A random key is generated once and stored in D1 (`app_secrets`) | Signs photo URLs. Changing it invalidates photo links already handed out (they expire anyway). |
| `VAPID_PUBLIC_KEY` | no | A key pair is generated once and stored in D1 | base64url, uncompressed P-256 point. Set both or neither. See [web-push.md](web-push.md). |
| `VAPID_PRIVATE_KEY` | no | as above | base64url 32-byte private scalar `d`. |

Generate a random value with:

```bash
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Local development

`wrangler dev` reads secrets from `.dev.vars` (copy `.dev.vars.example`; git-ignored). Plain `vars` still come from `wrangler.jsonc`. See [local-development.md](local-development.md).

## Build-time settings

| Name | Where | Effect |
| --- | --- | --- |
| `VITE_API_URL` | shell or `.env` when running `npm run build` | Only adds a `<link rel="preconnect">` hint when the API is on another origin. The app always calls `/api` on its own origin. Normally leave unset. |
| `POS_API` | shell when running `npm run dev` | Where Vite proxies `/api` (default `http://localhost:8787`). |

## Other settings in `wrangler.jsonc`

| Key | Value | Why |
| --- | --- | --- |
| `compatibility_date` | `2026-11-01` | Pins Workers runtime behaviour; tests use the same date. Bump deliberately. |
| `compatibility_flags` | `nodejs_compat` | Safety net for libraries that import `node:*` modules. |
| `assets.run_worker_first` | `["/api/*"]` | Only API calls cost a Worker invocation. |
| `assets.not_found_handling` | `single-page-application` | Deep links like `/tenants/42` load the app. |
| `observability.enabled` | `true` | Logs in the dashboard. |
| `workers_dev` | `true` | Serve on `*.workers.dev`. Set `false` once a custom domain works. |
| `preview_urls` | `false` | Public URLs for uploaded versions. They would run on the production D1 and R2, so they are off. |
| `upload_source_maps` | `true` | Readable stack traces in `npm run cf:tail` and the dashboard. |
| `triggers.crons` | `30 0 * * *` | Daily cycle at 06:00 IST. |
| `queues.consumers[0]` | batch 10, 5 retries | Each workspace message is retried after 5 minutes on failure. |

## In the app

Some behaviour is switched in code rather than config:

- `src/lib/features.ts`: turn receipts, meter readings, automations or reports off to show a "Soon" preview instead.
- `worker/server/core/auth.ts`: sessions last 30 days and are refreshed on use.
