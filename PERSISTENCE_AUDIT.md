# Persistence audit — temporary portal

The hosted application uses Neon PostgreSQL as its authoritative state store. The application creates `midama_app_state` and `midama_email_otps` automatically and refuses to fall back to local JSON storage in production.

## Hosted state protection

- Application state is stored as JSONB in a versioned Neon row.
- Every write uses an atomic version-checked update to avoid silently overwriting concurrent changes.
- A missing state row is initialized only with the built-in system seed; the ZIP's local backups and any previous provider data are not imported automatically.
- Neon read/write failures are surfaced instead of silently falling back to an empty local database.

## Local development

Without `DATABASE_URL`, local development can use the existing JSON file store for non-authenticated development. OTP registration/login requires Neon because OTP hashes are stored in the Neon OTP table.

## Production requirement

Render production requires `DATABASE_URL`, a strong `MID_AMA_SESSION_SECRET`, Resend configuration, and Cloudflare R2 credentials. See `SETUP_INSTRUCTIONS.md`.
