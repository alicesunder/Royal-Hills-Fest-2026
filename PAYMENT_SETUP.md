# Royal Hills Fest 2026 — Payment setup

This branch implements **manual PromptPay verification**: a buyer places an order, transfers to the official PromptPay QR, submits a slip and transaction reference, and an enabled admin checks the actual incoming bank transaction before approving. The backend only issues tickets after that approval.

## 1. Cloudflare Pages build variables

In **Cloudflare Dashboard → Workers & Pages → the Pages project → Settings → Environment variables**, set the following for Preview and Production:

- `VITE_SUPABASE_URL`: `https://imgkvxetdnerqnipfutd.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: copy the publishable key from Supabase **Project Settings → API Keys**. This is a public client key and is intentionally used in the browser.
- `VITE_PROMPTPAY_QR_URL`: `/promptpay-qr.png` only after the authentic QR image has been added to `public/promptpay-qr.png`.

Then run a new build/deployment. **Never set a service-role or secret key as a `VITE_*` variable or commit it to GitHub.**

## 2. Add the authentic PromptPay QR image

Copy the exact QR image issued for the receiving account to `public/promptpay-qr.png`. Do not redraw/re-create the QR or use a sample. Check it with the receiving bank/app before opening sales. The site does not claim that this static QR detects incoming transfers automatically.

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

## Status

- Database schema and manual review workflow are deployed in Supabase.
- Edge Function `ticketing-api` is deployed.
- Frontend is on the non-production `cloudflare-pages-setup` Git branch.
- Real QR image and admin allowlist are still owner-specific setup steps. Live sales remain disabled.
