# Royal Hills Fest 2026 — Payment setup

This branch implements **manual PromptPay verification**: a buyer places an order, transfers to the official PromptPay QR, submits a slip and transaction reference, and an enabled admin checks the actual incoming bank transaction before approving. The backend only issues tickets after that approval.

## 1. Cloudflare Pages build variables

In **Cloudflare Dashboard → Workers & Pages → the Pages project → Settings → Environment variables**, set the following for Preview and Production:

- `VITE_SUPABASE_URL`: `https://imgkvxetdnerqnipfutd.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: copy the publishable key from Supabase **Project Settings → API Keys**. This is a public client key and is intentionally used in the browser.
- `VITE_PROMPTPAY_QR_URL`: `/promptpay-qr.png` only after the authentic QR image has been added to `public/promptpay-qr.png`.

Then run a new build/deployment. **Never set a service-role or secret key as a `VITE_*` variable or commit it to GitHub.**

## 2. PromptPay QR image

The checkout now defaults to `/promptpay-qr.svg`. This vector QR was generated from the exact 74-character payload decoded from the SCB/PromptPay image supplied by the event owner; a round-trip decode test confirmed that the payload matches. The displayed pattern is regenerated in black and white, so it does not retain the SCB logo shown in the original screenshot.

Before opening sales, scan the displayed QR with the receiving bank app and verify the beneficiary details yourself. This is a static receiving QR: it does not detect incoming transfers, verify an amount, or confirm payment automatically. An enabled admin must still compare the real incoming bank transaction before approving a payment.

## 3. Create the payment-review admin

1. In Supabase **Authentication → Users**, add the trusted admin's user account.
2. Copy that user's UUID.
3. Open SQL Editor and run the following with that exact UUID:

```sql
insert into ticketing_private.admin_users (user_id, enabled)
values ('REPLACE_WITH_ADMIN_USER_UUID'::uuid, true)
on conflict (user_id) do update set enabled = true;
```

Only users present in this private allowlist can open the payment review queue or approve/reject slips. Do not enable public sign-up for payment-review administrators.

## 4. Ticket catalogue

The initial database seed is deliberately **inactive**. It uses the site's existing draft catalogue values: normal ticket THB 555, VIP table THB 5,555, capacity 500 normal tickets and 20 VIP tables. Verify these commercial values and actual event capacity with the event owner before changing `is_active` to `true`. Do not open sales until the receiving QR, allowed admin, environment variables, stock and review workflow have all been tested.

## 5. Safe test checklist

- A pending order reserves stock; the amount is calculated on the server from the database price.
- Customer lookup requires the private random lookup token created at checkout.
- A submitted image is only a claim of payment, never proof that money arrived.
- Admin opens the private slip link and verifies the actual transaction, amount and destination account in the bank account before approving.
- Rejected submissions do not issue tickets. Approval transitions the order to paid and issues server-stored ticket tokens in one database transaction.
- Rejected submissions receive a fresh 15-minute window so the buyer can submit a corrected proof.
- Checkout shows the order number and a private lookup key. Buyers can use both to retrieve the order from another device; the lookup key must be kept private.
- A ticket's QR is not considered checked in until the authenticated check-in endpoint validates it and marks it used.
- Test with internal/test orders first; do not transfer real money while ticket types remain inactive.

## Gate check-in

The `เช็กอินหน้างาน` page now uses the same Supabase Auth admin allowlist and verifies each scanned QR token against the database. A ticket is accepted only when its order is paid and its ticket status is still unused; repeat scans are rejected and logged. The gate scanner requires the same admin account to be enabled in `ticketing_private.admin_users`.

**Current VIP limitation:** one VIP QR currently checks in the entire VIP table as one ticket. Per-seat VIP check-in and wristband issuance are not yet connected to the database scanner, so do not advertise per-seat online check-in until that workflow is built and tested.

## Ticket delivery

Email delivery is not integrated yet. The buyer email is collected for order reference, but the app does not send digital tickets by email. Buyers should save the order number and private lookup key shown at checkout, then use the **บัตรของฉัน** page to retrieve the ticket after admin approval. Do not promise email delivery until an email provider and delivery workflow have been configured and tested.

## Status

- Database schema and manual review workflow are deployed in Supabase.
- Edge Function `ticketing-api` is deployed.
- Frontend is on the non-production `cloudflare-pages-setup` Git branch.
- PromptPay QR SVG is present, but the recipient must still be verified in the banking app before launch.
- Admin allowlist is not configured yet. Ticket types remain inactive and live sales remain disabled.
