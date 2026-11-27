# D1 database and migrations

pOS keeps every table in one D1 database (binding `DB`, default name `pos`). D1 is SQLite, run by Cloudflare close to the Worker.

## Where the database lives

D1 keeps the primary copy in one region, chosen when the database is created and not changeable afterwards. Without a hint Cloudflare picks the region nearest to where the create command runs, which for GitHub Actions is usually the US, so every query from India would cross an ocean. `npm run cf:setup` therefore creates it with `--location apac`. Override with `D1_LOCATION=wnam|enam|weur|eeur|apac|oc npm run cf:setup`. It only applies when the database is first created; an existing database keeps its region (to move, create a new one and restore a backup into it, see [Restoring an export](#restoring-an-export)).

## Where the schema lives

```
worker/db/schema.ts                         the Drizzle schema: the source of truth
        │  npm run db:generate  (drizzle-kit generate --config drizzle.d1.config.ts)
        ▼
drizzle/<timestamp>_<name>/migration.sql    Drizzle's output (+ snapshot.json for diffing)
        │  npm run db:sync      (scripts/migrations.mjs, also run by db:generate and build)
        ▼
migrations/<timestamp>_<name>.sql           flat files that `wrangler d1 migrations apply` reads
        │
        ▼
worker/migrations.generated.ts              the same SQL embedded for the Pages build's self-migration
```

The config is named `drizzle.d1.config.ts` rather than the default `drizzle.config.ts` on purpose, so hosting build steps that auto-run `drizzle-kit` on a default config leave it alone.

## Changing the schema

1. Edit `worker/db/schema.ts`.
2. Generate the migration:

   ```bash
   npm run db:generate
   ```

3. Read the new `drizzle/<timestamp>_<name>/migration.sql`. D1 cannot `ALTER` most column properties, so Drizzle may rebuild a table (create new, copy, drop old, rename). Make sure that is what you want on a table with data.
4. Apply it locally and run the tests:

   ```bash
   npm run db:migrate:local
   npm test
   ```

5. Commit `worker/db/schema.ts`, `drizzle/`, `migrations/` and `worker/migrations.generated.ts` together. `tests/unit/migrate.test.ts` fails if the embedded copy is out of date.
6. `npm run deploy` applies it to production before the new code goes live.

### Hand-written SQL (triggers, backfills)

```bash
npx drizzle-kit generate --config drizzle.d1.config.ts --custom --name add_some_trigger
```

creates an empty migration folder. Write the SQL, separating statements with `--> statement-breakpoint` (both Wrangler's and the Pages runner's splitter rely on it; a `CREATE TRIGGER ... BEGIN ... END;` counts as one statement), then `npm run db:sync`.

### Rules that keep deploys safe

- **Never edit or delete a migration that has been deployed.** Add a new one.
- **Additive first.** Add columns as nullable or with a default; remove old ones in a later release, after no deployed code reads them. During gradual rollouts and on preview URLs, old and new code share one database.
- **Money invariants live in the database.** Triggers in `*_payment_guards.sql` and `*_fee_triggers_*.sql` abort any write that would over-pay a month. Keep them when you rebuild a table.

## Applying migrations

| Command | Database |
| --- | --- |
| `npm run db:migrate:local` | `.wrangler/state` (used by `wrangler dev`) |
| `npm run db:migrate:remote` | production |
| `npm run db:list` | lists which migrations production has applied |

Wrangler records applied files in the `d1_migrations` table. The Pages build records them in `pos_migrations` and also honours `d1_migrations`.

### When a migration fails

`wrangler d1 migrations apply` stops at the failing file. `npm run deploy` stops too, so the **old Worker stays live** and nothing is half-deployed. Check what landed with `npm run db:list`, fix the SQL in a **new** migration (or, if the failed one never applied anywhere, correct it), and deploy again.

## Querying production

```bash
npx wrangler d1 execute DB --remote --command "SELECT count(*) AS n FROM users"
npx wrangler d1 execute DB --remote --file ./query.sql
```

Or use the dashboard → **Storage & Databases → D1 → pos → Console**. Be careful with writes: there is no undo except Time Travel.

## Backups

### Your own copy

```bash
npm run cf:backup                 # full export to backups/pos-remote-<timestamp>.sql
npm run cf:backup -- --schema     # structure only
npm run cf:backup -- --local      # the local dev database
```

Keep these somewhere safe; they contain personal data (names, phone numbers, PAN if entered). Owners can also download a JSON backup of their own workspace in the app (**More → Export & backup**).

### Time Travel (point-in-time restore)

D1 keeps a log of every change: 7 days on Workers Free, 30 days on Workers Paid.

```bash
npx wrangler d1 time-travel info pos                                # current bookmark
npx wrangler d1 time-travel info pos --timestamp 2026-11-20T06:00:00Z
npx wrangler d1 time-travel restore pos --timestamp 2026-11-20T06:00:00Z
```

A restore replaces the **whole** database with its state at that moment; every later change is lost (the command prints a bookmark you can restore to, to undo the restore). Prefer exporting first.

### Restoring an export

Into a new, empty database:

```bash
npx wrangler d1 create pos-restore
npx wrangler d1 execute pos-restore --remote --file backups/pos-remote-<timestamp>.sql
```

then point `database_id` in `wrangler.jsonc` at it and deploy.

## Limits worth knowing

- 100 bound parameters per statement: `worker/db/index.ts` inlines values (safely escaped) for the few bigger `IN (...)` queries.
- No interactive transactions: use single guarded statements or `db.batch([...])`, which runs as one transaction.
- Database size: 500 MB on Free, 10 GB on Paid. A workspace with years of rent history is a few MB.
- See [limits-and-costs.md](limits-and-costs.md) for read/write quotas.
