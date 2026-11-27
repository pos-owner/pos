import type { Ai, D1Database, Queue, R2Bucket } from "@cloudflare/workers-types";

/**
 * Cloudflare bindings declared in wrangler.jsonc. The Worker entry (worker/index.ts) hands them over with
 * `setBindings(env)` on every request, cron run and queue batch. An isolate always serves one deployment, so
 * every call sees the same bindings object. Tests call `setBindings` with Miniflare's D1 and R2.
 */
export interface Bindings {
  /** D1: every table (worker/db/schema.ts). */
  DB: D1Database;
  /** R2: private photo bucket (maintenance, comments, meter photos) and cached PDF reports. */
  PHOTOS: R2Bucket;
  /** Workers AI: reads meter photos. Optional; without it people type the reading. */
  AI?: Ai;
  /** Queue: the daily cycle fans out one message per workspace (optional; without it the cron runs inline). */
  DAILY_QUEUE?: Queue<{ ownerId: string }>;
  /** Static assets (the React build in dist/). */
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  /** Plain-text settings (vars and secrets). */
  [name: string]: unknown;
}

let current: Bindings | null = null;

export function setBindings(env: Bindings) {
  current = env;
}

export function bindings(): Bindings {
  if (!current) throw new Error("Cloudflare bindings are not set (setBindings was never called).");
  return current;
}

/** True once a binding of that name is present (optional ones such as AI). */
export function hasBinding(name: string): boolean {
  return !!current && current[name] != null;
}
