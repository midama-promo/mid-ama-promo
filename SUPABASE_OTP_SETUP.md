# Supabase OTP setup for Mid-Ama Promo Distro

The Distro app now uses Supabase Auth email OTP for login.

## 1. Production environment

Add these server-side variables to the Distro deployment:

- `SUPABASE_URL` — existing Distro Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — existing server-only service role key
- `SUPABASE_ANON_KEY` — the Distro Supabase project's anon/publishable key
- `MID_AMA_SESSION_SECRET` — a long random secret dedicated to Mid-Ama sessions

Do not place `SUPABASE_SERVICE_ROLE_KEY` in frontend variables or source code.

## 2. Enable email OTP

In the Distro Supabase project, keep Email authentication enabled.

For the Magic Link / OTP email template, use the OTP token variable rather than only a confirmation URL. For example:

```html
<h2>Mid-Ama Promo Login Code</h2>
<p>Use this one-time code to sign in to Mid-Ama Promo:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 8px;">{{ .Token }}</p>
<p>This code is for one login only. Never share it with anyone.</p>
```

The application expects a six-digit code.

## 3. Account creation behavior

The application requests OTP with `create_user: false`. This means the login flow does not create new accounts. Only users already registered in the Mid-Ama database and linked to Supabase Auth can receive an application session.

## 4. Recommended Auth settings

- Keep the OTP resend/request cooldown enabled.
- Keep OTP expiration short and reasonable.
- Use the existing custom SMTP provider if configured for the Distro Supabase project.
- Configure the production Site URL correctly.

## 5. Important deployment note

After deploying this version, users should sign in again. Old application sessions may remain valid until they expire, but the new login path is OTP-only and old password endpoints return HTTP 410.
