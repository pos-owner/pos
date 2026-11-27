/**
 * Response hardening shared by both Cloudflare entry points (worker/index.ts for Workers, worker/pages-entry.ts for
 * Pages). Static assets get their headers from public/_headers instead; these only apply to API responses.
 */

/** True for `/api` and everything under `/api/` (the only paths the Worker code answers). */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Adds the security headers every API response carries, and `no-store` unless a route chose its own caching. */
export function secure(res: Response): Response {
  const out = new Response(res.body, res);
  const h = out.headers;
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("x-frame-options", "DENY");
  if (!h.has("cache-control")) h.set("cache-control", "no-store");
  return out;
}

/** A JSON response with the same headers as every other API response. */
export function secureJson(body: unknown, status = 200): Response {
  return secure(Response.json(body, { status }));
}
