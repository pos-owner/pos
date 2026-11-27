// D1 migrations pipeline, in one place. Safe to re-run: files are only written when their content changed.
//
//   1. drizzle/<timestamp>_<name>/migration.sql   (written by `drizzle-kit generate`)
//        ↓ copied as flat files
//   2. migrations/<timestamp>_<name>.sql          (what `wrangler d1 migrations apply` reads)
//        ↓ embedded as strings
//   3. worker/migrations.generated.ts             (lets the Pages bundle create/upgrade D1 by itself on first request)
//
//   npm run db:sync           (run automatically by `npm run db:generate`, `npm run build` and `npm run pages:bundle`)
//
// Hand-written SQL (triggers, backfills) starts as an empty Drizzle migration:
//   npx drizzle-kit generate --config drizzle.d1.config.ts --custom --name <verb_noun>
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const drizzleDir = join(root, "drizzle");
const flatDir = join(root, "migrations");
const embedded = join(root, "worker", "migrations.generated.ts");

async function writeIfChanged(file, body) {
  if (existsSync(file) && (await readFile(file, "utf8")) === body) return false;
  await writeFile(file, body);
  return true;
}

// Step 1 → 2: Drizzle folders to flat Wrangler files.
await mkdir(flatDir, { recursive: true });
let synced = 0;
if (existsSync(drizzleDir)) {
  for (const name of (await readdir(drizzleDir)).sort()) {
    const src = join(drizzleDir, name, "migration.sql");
    if (!existsSync(src)) continue;
    const body = `-- Generated from drizzle/${name}/migration.sql by scripts/migrations.mjs. Do not edit.\n${await readFile(src, "utf8")}\n`;
    if (await writeIfChanged(join(flatDir, `${name}.sql`), body)) {
      synced++;
      console.log(`synced migrations/${name}.sql`);
    }
  }
}
console.log(synced ? `${synced} migration(s) synced to migrations/` : "migrations/ is up to date");

// Step 2 → 3: flat files embedded into the Worker bundle.
const items = [];
for (const name of (await readdir(flatDir)).filter((n) => n.endsWith(".sql")).sort()) {
  items.push({ name, sql: await readFile(join(flatDir, name), "utf8") });
}
const ts = `// Generated from migrations/*.sql by scripts/migrations.mjs. Do not edit.
export const MIGRATIONS: { name: string; sql: string }[] = ${JSON.stringify(items, null, 2)};
`;
console.log(
  (await writeIfChanged(embedded, ts))
    ? `worker/migrations.generated.ts written (${items.length} migration(s))`
    : "worker/migrations.generated.ts is up to date",
);
