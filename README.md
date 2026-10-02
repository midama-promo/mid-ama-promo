# Mid-Ama Promo

## Production persistence

The production build no longer relies on `data/db.json` as its authoritative database. A deployed server/container may be replaced at any time, so local files are not treated as durable production storage.

Production uses:

- **Supabase Postgres** for registered clients, releases, catalogue records, enquiries, notifications and metadata.
- **Supabase Storage** (private bucket `midama-assets`) for artwork, MP3 masters and supporting documents.
- A database-side optimistic concurrency function so two application instances cannot silently overwrite one another's registrations.
- The bundled `data/db.json` / backups are used only as a **one-time seed source** when the hosted database is completely empty. Existing hosted data is never replaced by a seed file.

## First-time Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase-schema.sql` from this repository.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the production server secrets.
4. Redeploy the application.
5. The first startup seeds the hosted database from the newest bundled recovery snapshot if the hosted database has no state row. After that, deployments never overwrite the hosted state with bundled seed data.

### Important security rule

Never put `SUPABASE_SERVICE_ROLE_KEY` in React/Vite client code or expose it as a `VITE_*` variable. It must exist only in the server environment.

## Existing data in this package

The latest bundled recovery snapshot is preserved under `data/backups/`. It is used only when the new hosted database is empty. This is intended to recover the users/releases/catalogue that existed in the uploaded project before deployment.

The previously deployed `test` account is not present in this ZIP's recovery snapshots, so this package cannot reconstruct that account unless it is recovered from the old hosting instance/provider backup.

## Local development

Without Supabase environment variables the project continues to use the local development database. Do not use that mode for production deployment.

Run:

```bash
npm install
npm run dev
```

Production should always have both Supabase environment variables configured.
