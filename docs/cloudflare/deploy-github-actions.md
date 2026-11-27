# Deploy with GitHub Actions

`.github/workflows/cloudflare.yml` runs checks for pull requests and deploys after checks pass on pushes to `main` or a manual workflow run.

| Event | Work |
| --- | --- |
| Pull request | `npm ci`, `npm run check`, `npm test`, `npm run deploy:dry` |
| Push to `main` or manual dispatch | Same checks, then `npm run cf:setup` and `npm run deploy` |

Deploy jobs are serialized with a concurrency group and use the `production` GitHub environment.

## Configure credentials

Create a Cloudflare API token scoped to the account that hosts pOS. Grant only the account permissions needed for Worker deployment, D1, Queues and any enabled optional services. Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

Optionally add the `APP_URL` repository variable. If set, the build uses it for the absolute link-preview image and the workflow runs the read-only smoke test against that address after deployment. Add required reviewers to the `production` environment if deployments need approval.

Set Worker secrets such as `CRON_SECRET` separately with Wrangler or the Cloudflare dashboard; GitHub Actions does not create these Worker secrets.

## Database id

`npm run cf:setup` finds the named D1 database or creates it and fills the placeholder id in the CI checkout. Commit a real `database_id` in `wrangler.jsonc` if local commands should use the same database without an additional lookup.

Pull-request checks do not need Cloudflare secrets and do not deploy. Keep secrets out of pull-request code and logs.

## Troubleshooting

- Authentication or permission failures: verify the token, account ID and scopes.
- `npm ci` lockfile errors: run `npm install` locally and commit the matching lockfile.
- Migration failures stop deployment before the new Worker is published; see [D1 migrations](database-d1.md).
- Use the action logs to identify which check or deployment command failed.
