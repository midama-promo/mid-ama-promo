# Supabase Auth registration fix

This build links Mid-Ama client accounts to Supabase Authentication.

## Required server environment
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` = the server-only Supabase secret/service-role key

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend/Vite variables.

## Behavior
- Admin client registration creates a Supabase Auth user and stores its UUID as `authUserId` in the Mid-Ama client record.
- Existing client records without an `authUserId` are linked to Supabase Auth at server startup.
- First-time password creation and password reset update the linked Supabase Auth account.
- Invitation registration also creates/updates the linked Supabase Auth account.
- Existing Mid-Ama data remains authoritative for catalogue/dashboard data while Supabase Auth is the linked identity system.

## Verification
After deploying, register one test client from the website. In Supabase go to **Authentication → Users** and verify the email appears. Then check the Mid-Ama admin client list; the same client should appear there. Do not manually create the Auth user first, because the website now performs that linkage.
