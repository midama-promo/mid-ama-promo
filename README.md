# Mid-Ama Promo — Temporary Client Portal

This project is a Node.js/Express + React portal. The original public pages, client dashboard, admin dashboard, release workflow and R2-compatible file handling are retained.

## Providers

- **Render:** Node.js web service (deploy only after review and explicit approval).
- **Neon PostgreSQL:** stores application state and hashed, expiring OTP records.
- **Cloudflare R2:** private audio, artwork and document storage using S3-compatible signed requests.
- **Resend:** delivers six-digit email OTP codes and existing notification emails.

Supabase client/auth/database dependencies have been removed from the temporary portal code.

## Required environment variables

Set these in Render only when you explicitly approve deployment. For local development, copy `.env.example` to `.env` and fill in test credentials.

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production` on Render. |
| `DATABASE_URL` | Neon PostgreSQL connection string. Use the pooled connection string and keep it server-side. |
| `MID_AMA_SESSION_SECRET` | Long random secret used to sign application sessions. |
| `OTP_HASH_SECRET` | Optional separate long random secret for hashing OTP codes; defaults to the session secret. |
| `RESEND_API_KEY` | Resend API key. |
| `EMAIL_FROM` | Verified sender, e.g. `Mid-Ama Promo <no-reply@your-verified-domain>`. |
| `ADMIN_NOTIFICATION_EMAIL` | Admin notification recipient. |
| `R2_ACCOUNT_ID` | Cloudflare account ID. |
| `R2_BUCKET_NAME` | Private R2 bucket name. |
| `R2_ACCESS_KEY_ID` | R2 S3 access key ID. |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret access key. |
| `APP_URL` | Public portal URL used in notification links. |
| `PAYSTACK_SECRET_KEY` | Optional; required only for payment verification features. |
| `DOWNLOAD_SECRET` | Secret for temporary download tickets if enabled by the existing workflow. |
| `GEMINI_API_KEY` | Optional; only if the existing AI helper is used. |

## Database setup

The application creates two tables automatically on first connection:

- `midama_app_state`: versioned JSONB application state. Updates use a version-checked compare-and-swap to avoid overwriting concurrent changes.
- `midama_email_otps`: hashed OTPs with expiry and failed-attempt tracking.

The app does **not** automatically import customer records from another provider or from backup files in this ZIP. Any future data migration must be separately reviewed and explicitly approved.

## Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and fill in Neon, Resend and R2 test credentials.
3. Run `npm install`.
4. Run `npm run dev`.
5. Run `npm run build` to build the frontend.

For production, `npm start` starts the Express server and serves `dist`. Production startup refuses to run if the required Neon, session, Resend or R2 environment variables are missing. Do not use local JSON storage in production.

## Security notes

- OTP codes are six digits, expire after ten minutes, are stored only as keyed hashes, and are single-use.
- OTP requests are rate-limited by IP and email; verification attempts are limited.
- Unknown email addresses receive the same public response as known addresses to reduce account enumeration.
- The server assigns admin privileges only to the designated administrator email already defined in the application.
- R2 objects remain private and are served through short-lived signed URLs after the existing application access checks.
- Never expose `DATABASE_URL`, Resend keys, R2 secrets or session secrets in frontend variables.

## Legacy files

Any old file reference that points to a Supabase Storage object is not automatically imported or deleted. New uploads use R2. A legacy-asset migration requires separate access, object verification and approval; this package does not connect to Supabase.

## Deployment boundary

This ZIP is a local deliverable. It does not deploy itself, change DNS, alter Render settings, create a Neon database, modify a Cloudflare bucket, or access production customer data.
