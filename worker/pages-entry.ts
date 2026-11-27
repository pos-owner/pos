/**
 * Entry for Cloudflare Pages "advanced mode" (dist/_worker.js, uploaded by drag and drop from the dashboard). Same API
 * as worker/index.ts, but Pages cannot run Cron Triggers or Queue consumers, so only `fetch` is exported. The daily
 * rent cycle is run by a small separate cron Worker that calls /api/cron/daily (see cloudflare/cron-worker/).
 * _routes.json sends only /api/* here; every other path is a static file (with the single-page-app fallback).
 *
 * Bindings are added in the Pages dashboard (Settings → Bindings): DB (D1), PHOTOS (R2) and, optionally, AI.
 * The D1 schema is created on the first API request (worker/server/core/migrate.ts), so no SQL has to be pasted.
 * Build the upload with `npm run pages:bundle` (see docs/cloudflare/deploy-pages-upload.md).
 */
import api from "./server/routes.ts";
import { setBindings, type Bindings } from "./server/core/bindings.ts";
import { ensureSchema } from "./server/core/migrate.ts";
import { isApiPath, secure, secureJson as json } from "./server/core/secure.ts";

export default {
  async fetch(request: Request, env: Bindings, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    setBindings(env);
    const url = new URL(request.url);
    if (isApiPath(url.pathname)) {
      // /api/health doubles as a setup checklist: it says which bindings are connected (never any values).
      if (url.pathname === "/api/health") {
        const setup = {
          db: !!env.DB,
          photos: !!env.PHOTOS,
          ai: !!env.AI,
          cronSecret: typeof env.CRON_SECRET === "string",
        };
        let schema = false;
        if (env.DB) {
          try {
            await ensureSchema(env.DB);
            schema = true;
          } catch (e) {
            console.error("schema setup failed", e);
          }
        }
        return json({ ok: setup.db && setup.photos && schema, schema, ...setup });
      }
      if (!env.DB || !env.PHOTOS) {
        return json(
          {
            error: `Setup is not finished: connect the ${[!env.DB && "D1 database (DB)", !env.PHOTOS && "R2 bucket (PHOTOS)"].filter(Boolean).join(" and ")} under Settings → Bindings, then redeploy.`,
          },
          503,
        );
      }
      try {
        await ensureSchema(env.DB);
      } catch (e) {
        console.error("schema setup failed", e);
        return json({ error: "The database could not be set up. Open /api/health and check the Pages logs." }, 503);
      }
      return secure(await api.fetch(request, env, ctx as never));
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
};
