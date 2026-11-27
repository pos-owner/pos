import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import type { D1Database } from "@cloudflare/workers-types";
import { applyPending, splitStatements } from "../../worker/server/core/migrate.ts";
import { MIGRATIONS } from "../../worker/migrations.generated.ts";

async function freshDb() {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: "export default { fetch() { return new Response(null, { status: 404 }); } }",
      compatibilityDate: "2026-11-01",
      d1Databases: { DB: "migrate-test" },
    }),
  );
  const db = (await mf.getD1Database("DB")) as unknown as D1Database;
  return { mf, db };
}

test("the embedded migrations match migrations/*.sql (run `npm run db:sync`)", async () => {
  const dir = join(import.meta.dirname, "../../migrations");
  const names = (await readdir(dir)).filter((n) => n.endsWith(".sql")).sort();
  assert.deepEqual(
    MIGRATIONS.map((m) => m.name),
    names,
  );
  for (const m of MIGRATIONS) assert.equal(m.sql, await readFile(join(dir, m.name), "utf8"));
});

test("splitStatements drops comment-only chunks", () => {
  assert.deepEqual(splitStatements("-- header\nCREATE TABLE a (x);\n--> statement-breakpoint\n-- only a comment\n"), [
    "CREATE TABLE a (x);",
  ]);
});

test("applyPending builds the schema once and is safe to repeat", async () => {
  const { mf, db } = await freshDb();
  try {
    const first = await applyPending(db);
    assert.deepEqual(
      first,
      MIGRATIONS.map((m) => m.name),
    );
    assert.deepEqual(await applyPending(db), []);
    const t = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profiles'").first();
    assert.ok(t);
  } finally {
    await mf.dispose();
  }
});

test("a database already migrated by wrangler is recognised, not migrated twice", async () => {
  const { mf, db } = await freshDb();
  try {
    await db.prepare("CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)").run();
    for (const m of MIGRATIONS) await db.prepare("INSERT INTO d1_migrations (name) VALUES (?)").bind(m.name).run();
    assert.deepEqual(await applyPending(db), []);
    const t = await db.prepare("SELECT name FROM sqlite_master WHERE name = 'profiles'").first();
    assert.equal(t, null);
  } finally {
    await mf.dispose();
  }
});
