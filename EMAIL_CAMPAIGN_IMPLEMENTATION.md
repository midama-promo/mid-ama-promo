# Client Email Campaign implementation notes

This source update adds an administrator-only Client Email Campaign section.

## Included

- Loads client recipients from the existing application database state in Neon (`midama_app_state.state`).
- Keeps recipient lookup behind the existing session authentication and designated-admin authorization middleware.
- Supports individual selection, select-all, search, recipient count, editable subject/body, preview, and test-to-admin sending.
- Sends each recipient a separate Resend batch item (never a shared To/CC list), in batches of 50.
- Uses the same verified sender as OTP: `Mid-Ama Promo <no-reply@midamapromo.co.za>`.
- Stores campaign and per-recipient outcomes in the existing JSONB application state. The schema migration adds an empty `emailCampaigns` array when missing and does not replace existing records.
- Prevents a matching subject/body announcement from being attempted again for the same client account.
- Uses Resend batch idempotency keys for each batch.

## Sender separation

`server/otp.ts` is not changed. It continues using `EMAIL_FROM` for OTP messages. Campaign emails reuse that same `EMAIL_FROM` value, with the requested no-reply sender as a fallback. No new Render environment variable is introduced. Set the existing `EMAIL_FROM` value to:

`Mid-Ama Promo <no-reply@midamapromo.co.za>`

Keep `RESEND_API_KEY` server-side. Do not add it to any `VITE_` variable or frontend file.

## Before production deployment

1. Export a fresh backup from the existing admin dashboard and retain it outside the project.
2. Apply these source changes to the same Render-connected repository/branch; do not create a new database or replace the Neon state row.
3. Deploy and confirm the service starts successfully.
4. Open Admin Dashboard → Client Email Campaigns.
5. Send a test email to the administrator first and confirm the From address is `no-reply@midamapromo.co.za`.
6. Only after the test succeeds, select the intended clients and send the announcement.

No campaign has been sent by this source update. No production database, Render setting, Resend setting, OTP setting, or Cloudflare R2 object was changed here.

## Validation performed here

The modified TypeScript/TSX files passed TypeScript transpilation syntax checks. A full dependency-backed TypeScript check and Vite production build could not be run in this environment because dependency installation timed out. Run `npm install` and `npm run build` in the project environment before deploying.
