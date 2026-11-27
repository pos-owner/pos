# Deploy with GitHub Actions

`.github/workflows/cloudflare.yml` checks every pull request and deploys every push to `main`.

| Event | Jobs |
| --- | --- |
| Pull request | **Check**: `npm run check`, `npm test`, `npm run deploy:dry` |
| Push to `main` | **Check**, then **Deploy**: `npm run cf:setup`, `npm run deploy` |
| Actions → Cloudflare → Run workflow | Same as a push to `main` |

Deploys never overlap (`concurrency: deploy-cloudflare`), and a deploy only starts once the checks pass.

## 1. Create an API token

Cloudflare dashboard → **My Profile → API Tokens → Create Token → Create Custom Token**.

| Scope | Permission | Access |
| --- | --- | --- |
| Account | Workers Scripts | Edit |
| Account | D1 | Edit |
| Account | Workers R2 Storage | Edit |
| Account | Queues | Edit |
| Account | Workers AI | Read |
| Account | Account Settings | Read |
| Zone (only with a custom domain) | Workers Routes | Edit |

Under **Account Resources**, include only the account pOS lives in. Optionally restrict **Client IP Address Filtering** and set an expiry date.

## 2. Find your account ID

Dashboard → **Workers & Pages**: the Account ID is in the right-hand column. (Or run `npm run cf:whoami`.)

## 3. Add repository secrets

GitHub → your repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | the id from step 2 |

Optional, under the **Variables** tab next to Secrets: `APP_URL` (for example `https://pos.example.com`). The build uses it as the absolute address of the link-preview image (WhatsApp ignores relative ones), and when it is set the deploy job finishes with `npm run smoke` against it: health including a D1 query, static files and security headers, read-only.

The deploy job runs in a GitHub environment called `production`. You can add required reviewers to that environment (Settings → Environments) so a person approves each deploy.

## 4. Set Worker secrets once

GitHub Actions does not manage Worker secrets; set them once from your machine (or the dashboard → pos → Settings → Variables and Secrets):

```bash
npm run cf:secret -- CRON_SECRET
```

They persist across deploys.

## 5. Push

Push to `main`, or run the workflow by hand from the Actions tab. The first run creates the D1 database, R2 bucket and queue; later runs find them by name.

## About `database_id`

`wrangler.jsonc` ships with an all-zero placeholder id. `npm run cf:setup` fills it in inside the CI runner on each run by looking the database up by name, so the workflow works even if you never commit the real id. Committing it (after running `npm run cf:setup` locally) is still recommended, so local commands such as `npm run cf:backup` target the same database without any lookup.

## Pull requests and forks

The check job needs no secrets, so it also runs for pull requests from forks. Nothing is deployed from a pull request. If you want per-PR previews, add a job that runs `npx wrangler versions upload` with the secrets and set `"preview_urls": true` in `wrangler.jsonc`; be aware preview versions use the production D1 and R2. Both jobs have timeouts (10 and 15 minutes) so a stuck step cannot hold up the queue.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Authentication error [code: 10000]` | Token is missing a permission from the table above, or is scoped to another account |
| `You must be logged in` / prompts for login | `CLOUDFLARE_API_TOKEN` secret not set, or set as a variable rather than a secret |
| `Please enable R2 through the Cloudflare Dashboard` | Enable R2 once in the dashboard, then re-run the workflow |
| `npm ci` fails on lockfile | Run `npm install` locally and commit `package-lock.json` |
| Migrations step fails | See [database-d1.md](database-d1.md#when-a-migration-fails); the Worker was not deployed, the old version is still live |
