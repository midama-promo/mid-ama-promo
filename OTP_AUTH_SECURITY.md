# OTP authentication security

The temporary portal uses server-generated six-digit email OTPs delivered by Resend.

- Only registered, non-disabled accounts are sent login codes.
- Unknown addresses receive the same public response to reduce account enumeration.
- Codes expire after ten minutes and are single-use.
- Neon stores an HMAC-SHA256 hash of each code, never the plaintext code.
- The HMAC secret is `OTP_HASH_SECRET`, falling back to `MID_AMA_SESSION_SECRET`.
- Requests are rate-limited by IP/email; verification attempts are capped.
- Successful verification establishes the existing signed, HTTP-only application session cookie.
- The server assigns admin privileges only to the designated administrator email configured in `server/db.ts`.

Required server environment: `DATABASE_URL`, `MID_AMA_SESSION_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM`.
