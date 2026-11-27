# Cloudflare deployment and operations

The recommended setup is Cloudflare Workers: one Worker serves both the PWA and `/api/*`, while Cron and Queues run the daily job. Pages upload is an alternative with a separate cron Worker.

## Deploy

| Guide | Use it for |
| --- | --- |
| [Quickstart](quickstart.md) | First Workers deployment |
| [Workers and Wrangler](deploy-workers.md) | Full CLI deployment reference |
| [GitHub Actions](deploy-github-actions.md) | CI checks and automated deploys |
| [Pages upload](deploy-pages-upload.md) | Dashboard-based static upload |
| [Go-live checklist](deploy-checklist.md) | Production readiness |

## Configure and operate

| Guide | Topic |
| --- | --- |
| [Configuration](configuration.md) | Bindings, variables, secrets |
| [Custom domain](custom-domain.md) | Domain and TLS |
| [Email](email.md) | Optional password-reset email |
| [Web Push](web-push.md) | Browser push notifications |
| [Workers AI](workers-ai.md) | Optional meter-photo reading |
| [D1](database-d1.md) | Schema, migrations and backup |
| [Photos](storage-photos.md) | Private photos stored in D1 |
| [Cron and Queues](cron-and-queues.md) | Daily rent processing |
| [Local development](local-development.md) | Miniflare, D1 and tests |
| [Operations](operations.md) | Health, logs, backups and recovery |
| [Security](security.md) | Application and account safeguards |
| [Limits and costs](limits-and-costs.md) | Capacity planning |
| [Troubleshooting](troubleshooting.md) | Common problems |
