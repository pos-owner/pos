# pOS documentation

## Start here

| Goal | Guide |
| --- | --- |
| Understand the system | [Architecture](architecture.md) |
| Find code and generated files | [Project structure](project-structure.md) |
| Start a local development environment | [Local development](cloudflare/local-development.md) |
| Create a Cloudflare Workers deployment | [Quickstart](cloudflare/quickstart.md) |
| Browse deployment and operations topics | [Cloudflare guide index](cloudflare/README.md) |

## Cloudflare guides

- **Deploy:** [Quickstart](cloudflare/quickstart.md), [Workers](cloudflare/deploy-workers.md), [GitHub Actions](cloudflare/deploy-github-actions.md), [Pages upload](cloudflare/deploy-pages-upload.md), [go-live checklist](cloudflare/deploy-checklist.md).
- **Configure:** [Bindings and settings](cloudflare/configuration.md), [custom domain](cloudflare/custom-domain.md), [email](cloudflare/email.md), [Web Push](cloudflare/web-push.md), [Workers AI](cloudflare/workers-ai.md).
- **Data and jobs:** [D1 and migrations](cloudflare/database-d1.md), [photo storage](cloudflare/storage-photos.md), [Cron and Queues](cloudflare/cron-and-queues.md).
- **Operate safely:** [local development](cloudflare/local-development.md), [operations](cloudflare/operations.md), [security](cloudflare/security.md), [limits and costs](cloudflare/limits-and-costs.md), [troubleshooting](cloudflare/troubleshooting.md).

Workers is the recommended deployment: one Worker serves the app and API, and has Cron and Queue support. Pages is available when dashboard-based uploads are preferable; it needs a separate scheduled Worker for the daily cycle.
