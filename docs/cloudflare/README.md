# pOS on Cloudflare

Guides for deploying and running pOS on Cloudflare. New here? Start with the **quickstart**.

## Deploy

| Guide | When to use it |
| --- | --- |
| [quickstart.md](quickstart.md) | From zero to a live app in about ten minutes |
| [deploy-workers.md](deploy-workers.md) | The recommended method: Workers + Wrangler CLI, every option explained |
| [deploy-github-actions.md](deploy-github-actions.md) | Automatic deploys on every push to `main` |
| [deploy-pages-upload.md](deploy-pages-upload.md) | Upload a zip in the dashboard, no terminal on Cloudflare's side |
| [deploy-checklist.md](deploy-checklist.md) | Tick through before real people use it |

## Configure

| Guide | Covers |
| --- | --- |
| [configuration.md](configuration.md) | Every binding, variable and secret, in one table |
| [custom-domain.md](custom-domain.md) | `pos.example.com` instead of `workers.dev` |
| [email.md](email.md) | "Forgot password?" emails through Cloudflare Email Service |
| [web-push.md](web-push.md) | Push notifications and VAPID keys |
| [workers-ai.md](workers-ai.md) | Meter-photo reading with Workers AI |

## Data

| Guide | Covers |
| --- | --- |
| [database-d1.md](database-d1.md) | Schema changes, migrations, backups, Time Travel restores |
| [storage-r2.md](storage-r2.md) | The private photo bucket |
| [cron-and-queues.md](cron-and-queues.md) | The daily rent cycle: Cron Trigger, Queue, manual runs |

## Operate

| Guide | Covers |
| --- | --- |
| [local-development.md](local-development.md) | `wrangler dev`, Miniflare, local D1 and R2, tests |
| [operations.md](operations.md) | Logs, rollbacks, health checks, emergency reset links |
| [security.md](security.md) | Headers, cookies, secrets, API token scope |
| [limits-and-costs.md](limits-and-costs.md) | What fits on the Free plan, and when to upgrade |
| [troubleshooting.md](troubleshooting.md) | Error messages and their fixes |

## Which deploy method?

```
Do you have a terminal with Node.js?
├── yes → Do you want deploys on every git push?
│         ├── yes → GitHub Actions          (deploy-github-actions.md)
│         └── no  → Workers + Wrangler      (deploy-workers.md)   ← recommended
└── no  → Pages drag-and-drop               (deploy-pages-upload.md)
          (someone still runs `npm run pages:bundle` once to make the zip)
```

Workers is preferred because it has the Cron Trigger and Queue built in, applies migrations before the new code goes live, supports gradual rollouts and one-command rollbacks, and keeps every binding in version-controlled `wrangler.jsonc`.
