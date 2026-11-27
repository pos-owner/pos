# Web Push notifications

pOS can send rent reminders, payment updates and other notifications to supported browsers and installed apps. iOS requires the app to be added to the Home Screen and a supported OS version.

The Worker implements VAPID and payload encryption with Web Crypto. On first use, it can create a VAPID key pair and store it in D1. To manage keys yourself, set both `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as Worker secrets; optionally configure `VAPID_SUBJECT` as a contact URI. Do not configure only one key.

The browser retrieves the public key from `/api/push/key`, subscribes through its service worker and posts the endpoint and keys to `/api/push/subscribe`. Subscriptions and notifications are stored in D1. The service worker in `public/push-sw.js` displays incoming notifications and handles clicks.

Users can enable notifications and send themselves a test in Settings. The service worker and browser must be allowed to show notifications by the operating system.

## Privacy and endpoint validation

The Worker sends encrypted payloads to push-service endpoints; browsers do not make those requests from the page. The API validates endpoint URLs against supported push-service hosts. Keep that validation in sync if browser support is deliberately expanded.

Changing the VAPID key pair invalidates existing subscriptions. Devices need to open the app and subscribe again.
