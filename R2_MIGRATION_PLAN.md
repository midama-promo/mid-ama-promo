# Mid-Ama Promo: R2 cutover and legacy Supabase migration

## Current phase (before 29 November 2026)

- Supabase remains the identity/authentication provider and Postgres database.
- New artwork, MP3 and supporting-document uploads are written to the private Cloudflare R2 bucket `mid-ama-promo-files`.
- New database file references are prefixed `r2:`. Existing Supabase Storage references retain the `remote:` prefix so they are not mistaken for R2 objects.
- Do not delete, rename, overwrite, or attempt to recreate the old Supabase `midama-assets` bucket while access is restricted.

## Migration phase (after Supabase Storage access is restored)

1. Confirm Supabase Auth and Postgres still work, and confirm read access to the old `midama-assets` bucket.
2. Take a database snapshot/export before changing any file references.
3. Enumerate all objects in `midama-assets`, including nested folders. Record object key, byte size, MIME type, and available checksum/ETag metadata.
4. Copy each object to the R2 bucket while preserving its object key where possible. Do not overwrite an existing R2 object without comparing it first.
5. Verify every copied object by checking existence, size, and checksum where a comparable checksum is available. Re-download/sample-test media and artwork.
6. Identify every `remote:` path in releases, catalogue entries, profile assets, and any other database records. Update each reference to `r2:` only after its matching R2 object has passed verification.
7. Test client and admin access, public share pages, artwork previews, MP3 playback, and downloads.
8. Keep the Supabase bucket intact for a rollback period. Delete it only after explicit approval and a final backup.

The migration is intentionally a separate operation. This deployment does not bulk-copy or delete any legacy Supabase objects.
