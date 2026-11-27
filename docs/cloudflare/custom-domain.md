# Custom domain

For Workers, the domain must be in the Cloudflare account and use Cloudflare DNS. Add a custom domain in `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "pos.example.com", "custom_domain": true }]
```

Set `APP_URL` to `https://pos.example.com` for reset links and push contact, then deploy. Cloudflare provisions the route and TLS certificate. After verifying the custom domain, you may set `workers_dev` to false. Cookies are host-scoped, so users signing in on the new host must sign in again.

For Pages, use **Custom domains** in the project settings, set `APP_URL` on both the Pages project and companion cron Worker, then redeploy.

Use a subdomain rather than mounting pOS below a path: the app and service worker expect to live at `/` and use `/api`.

## TLS and headers

Use HTTPS and Cloudflare's strict TLS mode. `public/_headers` sets HSTS with `includeSubDomains`; this affects sibling subdomains of the host for the max-age period. Review that policy before deploying on a domain whose other subdomains have different requirements.

`APP_URL` can also be supplied to the build so the Open Graph image uses an absolute URL. The app's runtime API calls remain same-origin.
