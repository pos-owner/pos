import { bindings } from "./bindings.ts";

/**
 * Reads a plain-text setting: a `vars` entry in wrangler.jsonc or a secret (`wrangler secret put NAME`). Falls back
 * to `process.env` so Node tools and tests can set values too.
 */
export function env(name: string): string | undefined {
  let v: unknown;
  try {
    v = bindings()[name];
  } catch {
    v = undefined;
  }
  if (typeof v !== "string")
    v = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
