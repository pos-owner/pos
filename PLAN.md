# Upgrade plan

1. **Done** — Receipt redesign: new vector pOS logo in every PDF header; cut-edge (torn zigzag) A5 receipt slip with ticket notches, perforations, PAID / PART PAID / VOID status, VOID watermark, and a tear-off verification stub (QR moves beside the signature on long receipts so it stays on one page).
2. **Done** — Public verification page (`/verify`, `/verify/:code`): standalone branded page, verdict seal, on-screen cut-edge slip, "check before you accept" list, share/print, manual code/link entry, how-it-works, print and forced-colours styles. API now also returns issue date, method, months covered, void date and check time.
3. **Done** — Display & accessibility settings (theme override, text size, higher contrast, reduce motion), skip-link styles, forced-colours support.
4. **Done** — Quick search: Ctrl+K, "/" or the Home search button finds tenants (call in one tap), requests, screens and actions; remembers recent picks.
5. **Next** — Daily-work features: bulk reminders, smarter "today" queue, rent-due forecasting, auto-suggested late fees.
6. **Next** — UI polish pass across owner, staff and tenant screens; Hindi strings for all new text in `src/i18n/hi.json`.
7. **Next** — Tests for `extractCode`, quick-search `score`, and the new verify response fields; run `npm run verify`.
