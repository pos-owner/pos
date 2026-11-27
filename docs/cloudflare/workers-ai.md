# Workers AI: reading meter photos

Staff and owners can photograph an electricity or water meter and have the reading filled in. pOS sends the photo to a Workers AI vision model and asks for the number, a confidence and a short note. People always see and can correct the result before it is saved.

## Turn it on

Workers deployment: already on. `wrangler.jsonc` has

```jsonc
"ai": { "binding": "AI" }
```

Pages deployment: project → Settings → Bindings → Add → **Workers AI**, variable name `AI`, then redeploy.

Without the binding the app hides scanning and people type readings by hand.

## Settings

| Variable | Default | Effect |
| --- | --- | --- |
| `METER_AI` | on | `off` hides scanning even with the binding (handy to stop usage without a redeploy of bindings) |
| `METER_AI_MODEL` | `@cf/meta/llama-4-scout-17b-16e-instruct` | Any Workers AI model that accepts images. Browse them in the dashboard under **AI → Workers AI → Models** |

The code is in `worker/server/domain/meters.ts` (`POST /api/meters/scan`). Replies that wrap the JSON in prose or code fences are handled.

## Cost

Workers AI is billed in **Neurons**. The Free plan includes a daily allowance (10,000 Neurons/day at the time of writing), which covers a good number of meter scans; beyond it, usage is billed on Workers Paid. Check the current figures on Cloudflare's Workers AI pricing page, and watch usage under **AI → Workers AI** in the dashboard.

To cap spend, set `METER_AI=off`, or put an **AI Gateway** in front (dashboard → AI → AI Gateway) for rate limits, caching and analytics.

## Local development

Workers AI has no local emulation. With the binding present, `wrangler dev` asks you to log in and sends AI calls to your Cloudflare account (they count toward usage); `METER_AI=off` does not avoid the login. So `npm run dev:api` starts without the binding and meter scanning shows as unavailable. Use `npm run dev:api -- --ai` after `npm run cf:login` to try real scans. Tests never call it.
