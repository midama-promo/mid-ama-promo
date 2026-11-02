# Mid-Ama Promo temporary portal — setup

This guide is for preparing a separate temporary environment. It does not authorize or perform deployment, DNS changes, or edits to an existing production database.

## 1. Create the free-tier services

1. Create a Neon PostgreSQL project and copy its **pooled** connection string.
2. In Resend, create an API key and verify the domain used in `EMAIL_FROM`.
3. In Cloudflare R2, create a private bucket and an S3 API token with object read/write permissions for that bucket. Copy the account ID, access key ID and secret access key.
4. Generate two long random secrets, for example with `openssl rand -hex 32` (run it twice).

## 2. Configure environment variables

Copy `.env.example` to `.env` for local testing. Set:

- `DATABASE_URL`
- `MID_AMA_SESSION_SECRET`
- `OTP_HASH_SECRET` (use a different value from the session secret)
- `RESEND_API_KEY`
- `EMAIL_FROM` (must be a verified sender in Resend)
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Set `ADMIN_NOTIFICATION_EMAIL` and `APP_URL` as needed. Keep every secret on the server; never add a `VITE_` prefix.

## 3. Install and run locally

```bash
npm install
npm run dev
```

The application creates `midama_app_state` and `midama_email_otps` in the configured Neon database. A new database is initialized with the portal's built-in system accounts and empty application collections. It does not import records from any existing provider or backup archive.

To create a production build locally:

```bash
npm run build
```

## 4. Test before considering deployment

- Register a new test client with an email address you control.
- Confirm the OTP arrives through Resend.
- Verify the code and confirm the client dashboard loads.
- Request another code and confirm an incorrect/expired code is rejected.
- Confirm a client cannot access admin routes.
- Submit a test release with test audio/artwork and confirm the files appear in the private R2 bucket.
- Restart the local server and confirm the test account and release remain in Neon.
- Sign in with the designated admin account and verify the admin dashboard and client access tools.

Do not use real customer information for these tests.

## 5. Render deployment boundary

Only after explicit approval, configure the separate Render service with the production environment variables and the commands already in `package.json` (`npm run build`, then `npm start`). This package does not deploy, edit DNS, change existing Render services, or connect to the previous production database.

## Important legacy-data note

Legacy objects from an earlier storage provider are not automatically copied. The application intentionally does not connect to the old provider. A separately approved migration is required before old customer records or legacy files can be used in the temporary portal.
