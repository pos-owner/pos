# Web Push notifications

pOS sends push notifications (rent due, payment confirmed, request updates and so on) to installed apps and browsers that allow them. It works on Android, desktop browsers, and on iPhone/iPad once the app is added to the Home Screen (iOS 16.4+).

There are no third-party services or SDKs: `worker/server/core/webpush.ts` implements VAPID (RFC 8292) and payload encryption (RFC 8291) with WebCrypto, which Workers provide natively.

## Zero setup by default

On the first push-related request, pOS generates a VAPID key pair and stores it in D1 (`app_secrets`). Every later request reuses it. Nothing needs configuring.

## Bring your own keys (optional)

Set your own keys when you want them to survive a database rebuild, or to share them across environments:

```bash
npx web-push generate-vapid-keys --json      # or any VAPID key generator
npm run cf:secret -- VAPID_PUBLIC_KEY         # the "publicKey" value (base64url)
npm run cf:secret -- VAPID_PRIVATE_KEY        # the "privateKey" value (base64url)
```

Optionally set a contact the push services can reach you at:

```jsonc
"vars": { "VAPID_SUBJECT": "mailto:you@example.com" }
```

Without it pOS uses `APP_URL`. Changing keys later means existing subscriptions stop working; devices resubscribe the next time the app opens and asks.

## How it fits together

```
app → GET  /api/push/key          VAPID public key
    → browser subscribes (service worker: public/push-sw.js imported by the generated sw.js)
    → POST /api/push/subscribe    endpoint + keys stored in D1
event → notification row in D1 → sent right away or by the daily cycle
    → POST to the browser vendor's push endpoint (FCM, Mozilla, Apple)
    → push-sw.js shows it; tapping opens the right screen
```

People can send themselves a test from **Settings** (notifications section, `POST /api/push/test`).

## Content Security Policy

`public/_headers` allows `connect-src 'self'` and `worker-src 'self' blob:`. The app and its service worker only talk to their own origin (subscribing to push goes through the browser, not through `connect-src`), so keep `worker-src` as it is.

## Accepted push services

A subscription's endpoint is a URL the Worker later POSTs to, so `POST /api/push/subscribe` only accepts https endpoints without credentials on the default port, on the hosts of the push services browsers use: `fcm.googleapis.com` (Chrome, Edge, Brave, Opera, Samsung Internet), `*.push.services.mozilla.com` (Firefox), `*.notify.windows.com` and `*.push.apple.com` (Safari). The list is `PUSH_HOSTS` in `worker/server/core/webpush.ts`; add a host there if a browser you support uses another one.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| No prompt on iPhone | Push only works once the app is added to the Home Screen and opened from there |
| Test says sent, nothing appears | OS-level notifications disabled for the browser, or Focus/Do Not Disturb |
| Stopped after changing keys | Old subscriptions are tied to the old key; reopen the app to resubscribe |
| `410 Gone` in logs | The device unsubscribed; pOS removes that subscription |
