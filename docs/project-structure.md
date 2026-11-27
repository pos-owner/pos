# Project structure

```text
src/                         React PWA
  App.tsx                    routes and role-based app shell
  screens/                   auth, owner, staff, tenant, shared, tools and public screens
  components/                shared UI, icons, search, photo picker and install prompt
  lib/                       API client, auth, offline outbox, push, PDF and formatting
  i18n/                      Hindi translations
  styles/                    global and screen styles
worker/
  index.ts                   Workers entry: API, scheduled event and queue consumer
  pages-entry.ts              Pages entry: API and first-request migration
  db/schema.ts                Drizzle schema and source of truth for database tables
  db/index.ts                 D1 connection and query helpers
  server/routes.ts            Hono application and route registration
  server/*Routes.ts           auth, billing, documents, payment and tool endpoints
  server/core/                bindings, auth, storage, migrations, headers and shared services
  server/domain/              rent, payment, lease, meter, report and notification logic
shared/                      browser/Worker code, including PDF layouts
drizzle/                     Drizzle migration SQL and snapshots
migrations/                  Wrangler migration files
scripts/                     migration sync, dev, deployment, backup and smoke helpers
cloudflare/cron-worker/       daily scheduler used only by the Pages deployment
public/                      static assets, headers and Web Push handler
tests/unit/                  pure logic and migration tests
tests/api/                   Hono API tests using Miniflare D1
tests/helpers/                API and workspace test setup
docs/                        project and Cloudflare documentation
```

## Important commands

- `npm run dev:api` starts the local Worker and D1.
- `npm run dev` starts Vite and proxies `/api` to the Worker.
- `npm run check`, `npm test` and `npm run verify` type-check, test and build the project.
- `npm run db:generate` generates a Drizzle migration; `npm run db:sync` updates the Wrangler and Pages copies.
- `npm run deploy` builds, applies remote migrations and deploys the Workers target.
- `npm run pages:bundle` makes the upload bundle for Cloudflare Pages.

## Generated files

Do not edit generated migration copies or build output by hand. Make schema changes in `worker/db/schema.ts`, create a migration with Drizzle, then run `npm run db:sync`. That script generates the flat `migrations/*.sql` files and `worker/migrations.generated.ts`. `dist/`, `.wrangler/` and `pos-upload.zip` are build or tool output.
