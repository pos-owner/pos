# Optional password-reset email

Email is optional. pOS uses it only for password-reset links. Without an email binding, owners can create reset links for staff and tenants in the app, and an owner can use the [emergency reset command](operations.md#emergency-password-reset).

## Workers setup

Configure a Cloudflare Email Service sending domain and bind it as `EMAIL` in `wrangler.jsonc`. Set `EMAIL_FROM` to a sender address on that configured domain and set `APP_URL` to the public app origin:

```jsonc
"vars": {
  "APP_URL": "https://pos.example.com",
  "EMAIL_FROM": "no-reply@example.com"
},
"send_email": [{ "name": "EMAIL" }]
```

Deploy with `npm run deploy`. Never put credentials or secret values in `wrangler.jsonc`.

Pages does not provide the same Send Email binding in this setup; use owner-generated links or a Workers deployment if reset email is required.

## Verify and troubleshoot

Request a reset for an account you control and inspect Worker logs if delivery fails. Confirm the sender domain and any destination restrictions. Reset requests are rate limited and are designed not to disclose whether an email belongs to an account.
