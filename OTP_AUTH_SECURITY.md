# Mid-Ama Promo OTP Authentication Security

This release changes public Distro authentication from password login to passwordless email OTP.

## Authentication flow

1. User enters their registered email address.
2. The server requests a Supabase Auth email OTP with `create_user: false`.
3. The user enters the six-digit code received by email.
4. Supabase Auth verifies the code.
5. The server matches the verified email to the existing Mid-Ama user record.
6. The server issues the existing signed Mid-Ama application session.
7. The session is stored in an `HttpOnly`, `Secure` cookie for normal browser use.

## Protections

- No public password login endpoint.
- No email-only password creation.
- No email-only direct password reset.
- OTP request cooldown: 60 seconds per IP/email key.
- OTP verification attempts are capped at 8 per 10-minute window per IP/email key.
- Supabase Auth's own OTP/IP rate limits remain active.
- Unknown email addresses receive the same generic OTP-request response to reduce account enumeration.
- Only existing Mid-Ama users can receive an authenticated application session.
- Admin authorization remains server-side and is restricted to `remoabetswemolefi@gmail.com`.
- Browser `localStorage` is no longer used for the Mid-Ama session token.
- The normal browser session is sent as an HttpOnly cookie.
- Existing signed Mid-Ama session validation remains in place.

## Persistence protection

The following Distro persistence files were intentionally not changed by the OTP implementation:

- `server/remote.ts` persistence implementation
- `supabase-schema.sql`
- `PERSISTENCE_AUDIT.md`

No database reset, table recreation, migration, or destructive persistence operation is part of this authentication change.

## Required production environment

In addition to the existing server-side Supabase persistence credentials, production needs:

- `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`) for the server-side Supabase Auth OTP endpoints.
- `MID_AMA_SESSION_SECRET` strongly recommended as a dedicated random session-signing secret.

The Supabase service-role key must remain server-side and must never be placed in frontend code.
