# Configuration reference

For Workers, bindings and plain-text variables are in `wrangler.jsonc`; encrypted Worker secrets are set with `npm run cf:secret -- NAME`. For Pages, configure bindings and variables in the project settings. Local secrets go in `.dev.vars`, which is ignored by git.

Server code reads bindings through `bindings()` and settings through `env()`.

## Bindings

| Name | Type | Required | Purpose |
| --- | --- | --- | --- |
| `DB` | D1 database | Yes | Application data, migration state, photo data and generated secrets |
| `ASSETS` | Static assets | Workers: configured | PWA files from `dist/` |
| `AI` | Workers AI | No | Optional meter-photo reading |
| `DAILY_QUEUE` | Queue producer | Workers: recommended | Per-workspace daily-cycle processing |
| `EMAIL` | Send Email | No | Optional password-reset email |

The Workers deployment also configures the `pos-daily` Queue consumer in `wrangler.jsonc`. Pages does not use that queue.

## Plain-text settings

| Name | Default | Purpose |
| --- | --- | --- |
| `SIGNUPS` | `open` | `closed` prevents new owner accounts; invited staff and tenants can still join. |
| `APP_URL` | Request origin | Public URL used in reset links and push contact. Also set at build time for absolute link-preview image URLs. |
| `METER_AI` | `on` | Set to `off` to disable photo scanning even if AI is bound. |
| `METER_AI_MODEL` | `@cf/meta/llama-4-scout-17b-16e-instruct` | Workers AI vision model for meter photos. |
| `EMAIL_FROM` | Unset | Sender address for reset email; requires `EMAIL`. |
| `VAPID_SUBJECT` | `APP_URL` | Optional contact identifier for push services, usually `mailto:…` or an HTTPS URL. |

`APP_URL` used during the Vite build is a build environment variable; a runtime Worker variable alone cannot rewrite the already-built HTML image metadata.

## Secrets

| Name | Required | Behavior when unset |
| --- | --- | --- |
| `CRON_SECRET` | Required for manual cron API and Pages scheduler | Manual endpoint returns 403 |
| `SIGNING_SECRET` | Optional | A signing key is generated and stored in D1 |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Optional; set both or neither | A key pair is generated and stored in D1 |

Secrets are never placed in `wrangler.jsonc` or committed. Use `npm run cf:secret -- NAME` for Workers.

## Build and local settings

- `POS_API` changes the target for Vite's `/api` development proxy; default is `http://localhost:8787`.
- `VITE_API_URL` adds a preconnect hint when the API is on another origin. The application still calls `/api` on its own origin.
- `.dev.vars.example` is a template for local settings. Copy it to `.dev.vars`.

Other deployment behavior—compatibility date, assets routing, Cron, Queue and observability—is configured in `wrangler.jsonc`.
