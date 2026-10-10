# Royal Hills Fest 2026 — Payment setup

The existing checkout continues to support the original manual PromptPay workflow as a fallback. The optional Opn/Omise integration adds per-order PromptPay QR and Mobile Banking redirects; tickets are issued only by the database after a verified successful provider charge.

## 1. Provider account and eligibility

An authorized event organizer must complete Opn/Omise merchant onboarding and request activation of the payment methods to be used. Mobile Banking methods may require additional approval/terms from Opn. Do not enable online sales until the account is approved and the beneficiary and commercial terms have been confirmed.

The supported Mobile Banking charge source types currently wired into the code are:

- `mobile_banking_kbank` — K PLUS
- `mobile_banking_scb` — SCB Easy
- `mobile_banking_ktb` — Krungthai NEXT
- `mobile_banking_bbl` — Bangkok Bank
- `mobile_banking_bay` — Krungsri KMA

Enable only payment methods that Opn has actually activated for the merchant account.

## 2. Configure Edge Function secrets

Never place server-side keys in Vite environment variables, frontend source code, GitHub, screenshots, or chat messages.

In Supabase Dashboard → Project `imgkvxetdnerqnipfutd` → Edge Functions → Secrets, add the following **for the environment you are testing**:

- `OMISE_MODE`: set to `test` throughout development and end-to-end testing. The server defaults to `test` and rejects API key prefixes that do not match the configured mode.
- `OMISE_SECRET_KEY`: secret key copied from the Opn/Omise dashboard. In `test` mode it must start with `skey_test_`; the server will refuse a mismatched key.
- `OMISE_WEBHOOK_SECRET`: Base64-encoded webhook signing secret from the same test/live environment.
- `OMISE_PROMPTPAY_ENABLED`: keep `false` until PromptPay has been enabled and the full test plan has passed.
- `OMISE_MOBILE_BANKING_ENABLED`: keep `false` until the required Mobile Banking methods have been enabled and the full test plan has passed.
- `PUBLIC_SITE_URL`: `https://royalhillsfest2026-three.vercel.app`.

Supabase already supplies `SUPABASE_URL` and the project server key to Edge Functions. Do not create a `VITE_OMISE_SECRET_KEY`, do not store a secret key in Vercel's public frontend environment, and do not commit any secret values to the repository.

Capabilities are deliberately reported as disabled unless both the Opn secret key and webhook secret exist and their feature flags are enabled. The checkout then keeps the manual slip-review path available.

## 3. Deploy and register the webhook

The webhook Edge Function URL is:

`https://imgkvxetdnerqnipfutd.supabase.co/functions/v1/omise-webhook`

The charge creation request adds this URL as its per-charge webhook endpoint. The function verifies Opn's HMAC-SHA256 signature over the exact raw request body, checks the timestamp, independently fetches the charge from Opn, verifies the order number, source type, currency, amount and successful status, and then calls a service-role-only database function. Never mark an order paid based on the browser return URL or a submitted slip alone.

Opn documents the webhook signature headers and verification flow at https://docs.omise.co/api-webhooks/thailand. Configure a webhook secret in the correct test/live dashboard environment.

## 4. Database and issuance safety

The additive migration `20261010130000_opn_automated_payments.sql` adds narrowly scoped service-role-only functions to:
- claim a payment attempt without creating duplicate charges on repeated checkout requests;
- bind the provider charge to the order;
- reconcile the charge after a redirect or webhook;
- verify THB currency and exact amount;
- issue ticket records and QR tokens in the same database transaction as the paid/order-inventory update;
- refuse to issue duplicate tickets when a webhook is retried.

If the amount does not match, or a late payment arrives after inventory has been released and the stock cannot be re-reserved, the order is held for manual review rather than issuing a ticket automatically.

## 5. Required test plan before live mode

1. Keep ticket types inactive or use only test-mode charges while validating the provider integration.
2. In test mode, exercise both PromptPay and each activated Mobile Banking source. Confirm a pending charge does not issue tickets.
3. Simulate successful and failed test charges in the Opn dashboard. Confirm success issues the expected number of tickets once, and a failed/cancelled payment never issues tickets.
4. Replay the same successful webhook event. Confirm the order still has only one set of ticket rows.
5. Test mismatched amount/currency, unknown order, expired order, double-click/retry, user returning without paying, and temporary provider/network failures.
6. Test the bank redirect and return to `/?payment_return=1&order=<order-number>`; the browser return itself is not proof of payment, and the server must independently verify status.
7. Only after review, switch to live API/webhook secrets and ask Opn to confirm that the actual merchant account is eligible for the intended methods.

## 6. Existing features and current limits

- Existing manual slip review remains available when Opn secrets are absent or automated channels are disabled.
- Email delivery is not integrated yet. Buyers can retrieve paid tickets from the **บัตรของฉัน** page using the order number and private lookup key saved at checkout.
- QR check-in remains database-backed; a QR is not considered used until the authenticated check-in endpoint records it.
- The automatic-payment branch has not been tested with real merchant credentials in this environment. Do not accept real payments until the test plan above is completed and the merchant account has been approved.
