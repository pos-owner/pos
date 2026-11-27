import type { D1Database } from "@cloudflare/workers-types";
import { MIGRATIONS } from "../../migrations.generated.ts";

/**
 * Creates and upgrades the D1 schema from inside the Worker, so a dashboard (drag-and-drop) deploy needs no terminal
 * and no SQL pasting. Only the Pages entry (worker/pages-entry.ts) calls it; `wrangler deploy` applies migrations
 * with `wrangler d1 migrations apply` instead. Applied migrations are recorded in `pos_migrations`; databases that
 * were migrated with wrangler (`d1_migrations`) are recognised, so switching deploy methods is safe.
 */

/** Splits a Drizzle migration into statements and drops comment-only lines. */
export function splitStatements(sql: string): string[] {
  return sql
    .split("--> statement-breakpoint")
    .map((raw) =>
      raw
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

export async function applyPending(db: D1Database, migrations = MIGRATIONS): Promise<string[]> {
  await db
    .prepare("CREATE TABLE IF NOT EXISTS pos_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)")
    .run();
  const done = new Set(
    (await db.prepare("SELECT name FROM pos_migrations").all<{ name: string }>()).results.map((r) => r.name),
  );
  const pending = migrations.filter((m) => !done.has(m.name));
  if (!pending.length) return [];

  try {
    const legacy = await db.prepare("SELECT name FROM d1_migrations").all<{ name: string }>();
    for (const r of legacy.results) done.add(r.name);
  } catch {
    /* no wrangler migration table: a fresh database */
  }

  const applied: string[] = [];
  for (const m of pending) {
    const mark = db.prepare("INSERT OR IGNORE INTO pos_migrations (name, applied_at) VALUES (?, ?)");
    if (done.has(m.name)) {
      await mark.bind(m.name, Date.now()).run();
      continue;
    }
    // One batch is one transaction: a migration lands completely or not at all.
    const statements = splitStatements(m.sql).map((s) => db.prepare(s));
    statements.push(mark.bind(m.name, Date.now()));
    try {
      await db.batch(statements);
      applied.push(m.name);
    } catch (e) {
      // Another isolate may have applied it a moment ago.
      const row = await db.prepare("SELECT 1 AS ok FROM pos_migrations WHERE name = ?").bind(m.name).first();
      if (!row) throw e;
    }
  }
  return applied;
}

let ready: Promise<unknown> | null = null;

/** Runs `applyPending` once per isolate; a failure is retried on the next request. */
export function ensureSchema(db: D1Database): Promise<unknown> {
  ready ??= applyPending(db).catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
