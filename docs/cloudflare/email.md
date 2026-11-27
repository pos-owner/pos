# Email: "Forgot password?"

Email is optional. pOS only sends one kind of email: the password-reset link a person asks for on the sign-in screen.

**Without email**, nothing breaks:

- Owners make reset links for their staff and tenants in the app (open the person, then **Password help**) and share them by WhatsApp or SMS.
- An owner who forgets their own password can get a link from the terminal:

  ```bash
  npm run cf:reset-link -- owner@example.com --url https://pos.example.com
  ```

  The link works once, for one hour. See [operations.md](operations.md#emergency-password-reset).

The app learns whether email is available from `GET /api/auth/config` (`email: true|false`). Without it, "Forgot password?" tells people to ask their workspace owner for a link.

## Set it up with Cloudflare Email

You need a domain on Cloudflare with Email set up for sending (dashboard → your domain → **Email**). Then:

1. In `wrangler.jsonc`, add the binding (uncomment it at the bottom):

   ```jsonc
   "send_email": [{ "name": "EMAIL" }]
   ```

   To restrict where it may send, Cloudflare also accepts `destination_address` or `allowed_destination_addresses` on the binding. For reset emails, leave it unrestricted.

2. Add the sender address to `vars`:

   ```jsonc
   "EMAIL_FROM": "no-reply@example.com"
   ```

   It must be an address on the domain you set up. Use a bare address, not `Name <address>`.

3. Set `APP_URL` to the public address, so links in emails point at the right site:

   ```jsonc
   "APP_URL": "https://pos.example.com"
   ```

4. `npm run deploy`.

`worker/server/core/mail.ts` first sends a structured message (Cloudflare Email Service). If the binding only accepts raw MIME messages, as Email Routing's send binding does, it retries with a plain-text MIME message built in the Worker.

## Pages deployment

The Pages dashboard does not offer a Send Email binding, so reset emails are a Workers-deployment feature. On Pages, use the reset-link options above.

## Checking it

Request a reset for your own address. If nothing arrives, `npm run cf:tail` shows the error from the binding. Common causes: `EMAIL_FROM` not on a domain enabled for sending, or the recipient not allowed by a destination restriction on the binding.

Requests are rate limited (10 per hour per IP address, 3 per hour per email address), and the API answers the same way whether or not an account exists, so it cannot be used to flood an inbox or to discover who has an account.
