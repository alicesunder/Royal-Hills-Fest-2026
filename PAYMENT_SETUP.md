# Payment workflow retired

Royal Hills Fest 2026 has moved to **free registration**. The website checkout no longer offers PromptPay, bank transfers, payment slips, Opn/Omise redirects, or payment approval.

## Current registration flow

1. The attendee selects an available ticket type and enters attendee details.
2. The API reserves inventory using the database catalogue and an idempotency key.
3. The server finalizes zero-value registrations and issues unique digital tickets and QR tokens in the database.
4. Attendees can retrieve their tickets from **บัตรของฉัน** using the saved order number and private lookup token.
5. Staff continue using the secure check-in scanner to validate QR tickets.

## Deployment checklist

- Apply the reviewed migration `20261011120000_free_registration.sql` to the target Supabase project before deploying the matching Edge Function and frontend.
- Confirm that ticket catalogue prices are zero and that the event organizer has intentionally enabled each ticket type. The migration does not change ticket activation or inventory capacity.
- Test registration with normal tickets, repeated requests using the same idempotency key, a full inventory, expired reservations, and check-in of a newly issued QR code.
- Do not manually mark registrations as successful in the browser. Only the server/database may finalize a zero-value order and issue its QR tickets.
- Existing orders and payment-review records are preserved by this migration; do not delete or rewrite historical records as part of switching to free registration.

This file remains for deployment history. No payment credentials or payment provider secrets are required for the free-registration flow.
