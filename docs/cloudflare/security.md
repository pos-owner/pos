# Security

Security depends on both the application and the Cloudflare account configuration. Keep dependencies, Worker settings, secrets and account access under review.

## Application controls

- Authentication uses secure, HTTP-only session cookies; session tokens are stored as hashes in D1.
- API routes enforce roles and workspace-scoped access. Unit and API tests cover access rules and important payment constraints.
- Sensitive API responses are not cached. Static response headers include a Content Security Policy, frame protection, MIME sniffing protection, referrer policy and HSTS.
- Authentication, reset, invite, upload, scan, verification and other sensitive operations use rate limits backed by D1.
- Photos are private D1 data served through short-lived signed URLs. Uploads are restricted to accepted image types and a 1,200,000-byte limit.
- D1 writes affecting money use guarded statements, batches or triggers; D1 has no interactive transactions.

## Operator responsibilities

- Enable two-factor authentication and use least-privilege Cloudflare roles.
- Scope the GitHub Actions token to the required account and rotate it when needed.
- Store `CRON_SECRET` and other secret values as Worker secrets, not in source control.
- Set `SIGNUPS=closed` if new owner accounts should not be created publicly.
- Protect SQL backups and exports; they contain personal information and may include generated secrets stored in D1.
- Use a long random `CRON_SECRET`, especially on Pages where the companion scheduler calls the manual cron endpoint.

Static HSTS includes `includeSubDomains`; verify that is appropriate for the domain. For security concerns, use the project's private reporting channel rather than publishing sensitive details.
