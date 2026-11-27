# Workers AI: meter-photo reading

When Workers AI is available, a user can photograph an electricity or water meter and receive a suggested reading. The user must review or correct the value before saving it; AI output is not treated as verified data.

## Enable

The Workers deployment declares the `AI` binding in `wrangler.jsonc`. Set `METER_AI=off` to disable the feature without removing the binding. The default model is `@cf/meta/llama-4-scout-17b-16e-instruct`; set `METER_AI_MODEL` to another supported vision model if needed.

For Pages, add Workers AI as binding `AI` and redeploy. Without the binding, manual meter entry remains available.

## Local development and usage

Workers AI has no local emulator. `npm run dev:api` intentionally removes the AI binding so the rest of the app works without Cloudflare login. To make real AI requests, authenticate and run `npm run dev:api -- --ai`; these requests use the account's Workers AI service.

Model availability, pricing and included quotas can change. Check Cloudflare's current Workers AI documentation and usage dashboard before enabling the feature for a large audience. Use `METER_AI=off` to stop requests.
