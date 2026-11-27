# Local development

The local Worker runs with Wrangler/Miniflare and a local D1 database. It does not use your production database or require Cloudflare authentication for normal development.

## Install and start

Use Node.js 22.18 or newer, then:

```bash
npm ci
cp .dev.vars.example .dev.vars   # optional
npm run dev:api                  # terminal 1, Worker at :8787
npm run dev                      # terminal 2, Vite at :5173
```

Open `http://localhost:5173`. Vite proxies `/api` to the local Worker so the app remains same-origin. Set `POS_API=http://localhost:9000` if the API runs on another port.

`dev:api` creates a generated, git-ignored `wrangler.dev.jsonc` without the Workers AI binding. To make real AI requests, authenticate with `npm run cf:login` and run `npm run dev:api -- --ai`; AI requests then use your Cloudflare account and may incur usage.

## Production-like preview

```bash
npm run preview
```

This builds the PWA and serves it through Wrangler's static assets behavior. Use it to validate installability, headers, SPA fallback and offline shell behavior. `npm run smoke` runs read-only checks against the default local URL; pass a URL to check another deployment.

## Local D1 and scheduled job

Local D1 data lives under `.wrangler/state/`. Apply migrations with `npm run db:migrate:local`. To inspect it:

```bash
npx wrangler d1 execute DB --local --command "SELECT id, email FROM users"
npm run cf:backup -- --local
```

To simulate the scheduled event, run `npx wrangler dev --test-scheduled` and request:

```bash
curl 'http://localhost:8787/__scheduled?cron=30+0+*+*+*'
```

Or call the protected API with the local `CRON_SECRET` value from `.dev.vars`.

## Checks

```bash
npm run check
npm test
npm run verify
```

Unit tests cover isolated business logic; API tests start the Hono app against Miniflare D1 with migrations applied. Each API test fixture uses its own database.

## Common issues

| Symptom | Resolution |
| --- | --- |
| Vite API requests fail | Start `npm run dev:api` and confirm the proxy port. |
| Missing tables | Run `npm run db:migrate:local`. |
| AI scanning unavailable | Expected without AI binding; use `--ai` after logging in if you intend to use cloud AI. |
| Signed out after deleting local state | Sessions are in local D1 and are removed with `.wrangler/state/`. |
| Wrangler asks for login | Use the `dev:api` script, which omits AI by default. |
