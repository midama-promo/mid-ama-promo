# Security and feature notes

- Application sessions use signed, expiring HMAC tokens and an HTTP-only cookie.
- Admin authorization is restricted server-side to the designated administrator email.
- Private asset routes verify the signed application session and enforce ownership checks.
- Email OTPs are six digits, ten-minute expiry, single-use, HMAC-hashed in Neon and protected by request/verification throttles.
- Resend API keys, Neon credentials, R2 secrets and session secrets remain server-side.
- The existing release metadata validation, Spotify/Apple Music profile requirements, C-Line/P-Line behavior, submission workflow, admin client-access features and royalty dashboard routes are retained.
