# D1 database and migrations

The Workers and Pages deployments use one D1 database through binding `DB`. `worker/db/schema.ts` is the source of truth for tables.

## Migration pipeline

```text
worker/db/schema.ts
  → drizzle/<timestamp>_<name>/migration.sql
  → migrations/<timestamp>_<name>.sql
  → worker/migrations.generated.ts
```

Generate a schema migration with `npm run db:generate`. Review its SQL, apply it locally and run the relevant tests. `npm run db:sync` copies Drizzle migrations into Wrangler's flat migration directory and embeds them for Pages. The build also runs the sync.

```bash
npm run db:generate
npm run db:migrate:local
npm test
```

Commit the schema, Drizzle output, flat migration and generated embedded file together. Do not edit generated copies by hand. Do not change or remove a migration already applied to a shared or production database; add a new migration instead. Prefer additive changes so old and new Worker versions remain compatible during deployment.

## Deploy behavior

Workers applies pending migrations with `wrangler d1 migrations apply DB --remote` before publishing new code. Pages applies embedded migrations on its first API request and records them in `pos_migrations`. The Pages runner recognizes Wrangler's `d1_migrations` table.

If migration application fails during Workers deployment, the new Worker is not published. Inspect the error and migration state; fix forward with a new migration unless the failed migration has not been applied anywhere and can safely be corrected.

## Location, query and consistency constraints

`npm run cf:setup` defaults to the `apac` location hint; override with `D1_LOCATION` when creating the database. Region is selected at creation and cannot be changed in place.

D1 has no interactive transactions. Use guarded single statements, `db.batch()` or database triggers for operations that must stay consistent. Keep D1's statement parameter limit in mind; the project has a helper for larger `IN` queries.

## Backup and restore

```bash
npm run cf:backup                 # remote SQL export
npm run cf:backup -- --schema     # schema only
npm run cf:backup -- --local      # local database
```

Exports contain personal data and generated secret material stored in D1. Protect them and keep copies outside the Cloudflare account. Owners can also export their own workspace from the app. D1 Time Travel is useful for point-in-time recovery, but restoring replaces the database state; read Cloudflare's current guidance before using it.

To restore an export, create an empty target database and import the SQL with `wrangler d1 execute <database> --remote --file <backup.sql>`. Update the deployment binding only after checking the restored data and migration records.

## Switching between Pages and Workers

Pages records applied migration names in `pos_migrations`; Wrangler uses `d1_migrations`. The Pages runner understands both tables, but Wrangler does not read `pos_migrations`. Before switching from Pages to Workers, back up D1 and copy the applied names so Wrangler does not replay old migrations:

```bash
npx wrangler d1 execute DB --remote --command "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL); INSERT OR IGNORE INTO d1_migrations (name) SELECT name FROM pos_migrations;"
```

Verify the resulting migration list with `npm run db:list` before deploying. Do not delete either migration table.
