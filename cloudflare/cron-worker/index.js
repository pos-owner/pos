// pOS daily job for the Cloudflare Pages deployment. Pages cannot run scheduled jobs, so this tiny separate Worker
// wakes up once a day and asks the app to run its daily rent cycle (create the month's charges, end finished
// tenancies, log reminders, clear expired sessions). It goes workspace by workspace so no single request does too much.
//
// Not needed for the Workers deployment (`npm run deploy`): that Worker has its own Cron Trigger and Queue.
//
// Deploy, either way (full guide: docs/cloudflare/cron-and-queues.md):
//   - Terminal:  set APP_URL in cloudflare/cron-worker/wrangler.jsonc, then
//                npm run cron:deploy && npx wrangler secret put CRON_SECRET -c cloudflare/cron-worker/wrangler.jsonc
//   - Dashboard: create a Worker, paste this file, add the variables APP_URL (your Pages address, for example
//                https://pos.pages.dev) and CRON_SECRET (the same value as in your Pages project), then add the
//                Cron Trigger 30 0 * * *  (06:00 IST).
//
// The free plan allows 50 outgoing requests per run, so one run handles up to about 45 workspaces.

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
};

async function call(env, query) {
  if (!env.APP_URL || !env.CRON_SECRET) throw new Error("Set the APP_URL and CRON_SECRET variables on this Worker.");
  const url = `${env.APP_URL.replace(/\/+$/, "")}/api/cron/daily${query}`;
  const res = await fetch(url, { method: "POST", headers: { "x-cron-secret": env.CRON_SECRET } });
  if (!res.ok) throw new Error(`${query || "(all)"} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function run(env) {
  const { owners } = await call(env, "?list=1");
  let created = 0;
  let failed = 0;
  for (const id of owners.slice(0, 45)) {
    try {
      const r = await call(env, `?owner=${encodeURIComponent(id)}`);
      created += r.created || 0;
    } catch (e) {
      failed++;
      console.error("workspace failed", id, String(e));
    }
  }
  const { pruned } = await call(env, "?prune=1");
  console.log(
    `daily cycle: ${owners.length} workspace(s), ${created} charge(s) created, ${failed} failed, ${pruned} pruned`,
  );
  if (failed) throw new Error(`${failed} workspace(s) failed; see the logs above`);
}
