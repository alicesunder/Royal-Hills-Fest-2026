# Local Supabase staging (no new cloud project)

This is a local-only test environment. It does not create a hosted Supabase project and must not be used for live sales. Docker image downloads use local disk and bandwidth; no additional Supabase monthly subscription is created.

## Prerequisites

- Docker Desktop installed and running on Windows.
- Node.js/npm installed.
- Access to the existing Supabase project only for a one-time **schema-only, read-only dump**. The dump contains table/function definitions and policies, not customer/order rows.
- The repository must be on the `local-supabase-staging` branch. The `local-staging` directory has its own Supabase config and migration folder; it points its Edge Functions at the source files under the main `supabase/functions` directory.

## 1. Create the local schema snapshot

Open PowerShell at the repository root. These commands run from `local-staging`; they do not create or upgrade any cloud resource.

```powershell
cd local-staging
npx supabase --version
npx supabase login
npx supabase link --project-ref imgkvxetdnerqnipfutd
```

When prompted, enter the database password locally in the terminal. Do **not** paste it into ChatGPT, GitHub, or a screenshot. Logging in/linking configures the local CLI; do not run any cloud deployment or migration commands.

Export schema only. Supabase CLI's default `db dump` omits data and custom roles; this command selects only the application's `public` and `ticketing_private` schemas.

```powershell
npx supabase db dump --linked --schema public,ticketing_private --file supabase/migrations/20261009000000_local_baseline.sql
```

The generated baseline is intentionally ignored by Git. It should stay on this computer and should not be committed.

## 2. Start the local database

Still inside `local-staging`:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase status
```

The reset command targets the **local** database. Do not add `--linked` to `db reset`.

The reset applies the local schema snapshot and then `supabase/seed.sql`. This adds local-only ticket types/inventory to the local database; no buyer/order rows are copied from production.

## 3. Configure the local frontend

At the repository root, copy `local-staging/vite.env.local.example` to `.env.local`. Then edit `.env.local` with the local API URL and local publishable/anon key printed by `npx supabase status`.

Example:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=PASTE_THE_LOCAL_KEY_FROM_SUPABASE_STATUS
VITE_LOCAL_PAYMENT_SANDBOX=true
```

Use only the **local** API URL and key. Do not put the production publishable key in this file.

## 4. Configure Test Mode for local Edge Functions

Copy `local-staging/supabase/env.local.example` to `local-staging/supabase/.env.local`, then fill in your own **Test Mode** Secret Key and Test Webhook Secret. Keep the mode exactly `test`. The server rejects keys whose prefix does not match the configured mode, so a `skey_live_` key will not be accepted while `OMISE_MODE=test`.

These secrets stay on your computer and are ignored by Git. Never use a Live Secret Key here. The two `*_ENABLED` values in this local-only file may remain `true` to test the UI with Test Keys; they do not change the cloud project's secrets.

Open one PowerShell terminal in `local-staging` and run:

```powershell
npx supabase functions serve --env-file supabase/.env.local
```

Open another terminal at the repository root and run:

```powershell
npm install
npm run dev
```

Open http://localhost:3000. The checkout has a local-sandbox guard: it hides the old static PromptPay/manual-slip route and blocks checkout until a Test Mode automatic payment method is available. Test only; do not scan or pay any static/production QR.

## 5. Important safety boundaries

- `supabase db dump --linked ...` is the one-time, read-only schema export. It does not export buyer/order rows.
- `supabase start`, `supabase status`, and `supabase db reset --local` target the local stack. Keep `--local` on reset.
- Do **not** run `supabase db push --linked`, `supabase migration up --linked`, `supabase functions deploy`, or `supabase secrets set` while working on this staging setup.
- The Test Mode checkout can poll the provider for charge status. An external provider cannot reach a local webhook URL without a tunnel; this setup does not install a tunnel or open your computer to the internet.
- To stop local Supabase services without deleting local data, run `npx supabase stop` from `local-staging`. This incurs no hosted Supabase charge.
