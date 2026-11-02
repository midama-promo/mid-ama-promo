# R2 implementation notes

- Supabase Postgres and Supabase Auth configuration remain unchanged.
- New file uploads use Cloudflare R2 through its S3-compatible endpoint and SigV4 request signing.
- The R2 bucket is expected to exist already; application startup performs a signed bucket connectivity check and does not create/delete buckets.
- R2 object keys are stored with an `r2:` prefix. Existing `remote:` values continue to identify legacy Supabase Storage objects.
- The Cloudflare API token is not required for normal S3-compatible uploads/downloads. The R2 Access Key ID and Secret Access Key are required and must be server-side Render environment variables.
- This code has had TypeScript syntax/transpilation checks. A full dependency install, production build, and live R2 upload/download test have not yet been completed in this environment.
