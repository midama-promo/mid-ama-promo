# Mid-Ama Promo™ — Safe Republish / Data Protection

## Before republishing

1. Sign in as an administrator.
2. Open **Admin → Settings → Data Backup**.
3. Click **Export Existing Data**.
4. Keep the downloaded `.tar.gz` backup in a safe location.
5. Do not delete or replace the production `data/db.json` or `uploads/` directory before verifying the backup.
6. Republish only to a hosting environment with persistent storage for `data/` and `uploads/`.

## What the backup contains

- `data/db.json` — client accounts, releases, metadata, enquiries, notifications and catalogue links.
- `uploads/` — uploaded artwork, audio masters and documents.

## Restore behavior

**Import Existing Data** is intentionally additive. Existing IDs and files are never overwritten or deleted. Missing records and missing files from the backup are restored.

The application also refuses to silently initialize a blank database if `data/db.json` is missing or corrupted. This prevents a deployment/storage failure from masquerading as an empty catalogue.

## Important hosting requirement

This application uses a persistent server-side file database (`data/db.json`) and persistent server-side uploads (`uploads/`). A hosting platform that replaces the filesystem on every deployment must provide a persistent volume/disk, or the application must be migrated to a managed database/object-storage architecture before production use.

## Catalogue

**Admin → Catalogue → Add Existing Release** creates a catalogue link to the existing release. It does not clone the client, change release ownership, replace metadata, or create a new release ID.

The catalogue also stores the internal SoundBlast distribution state. Actual SoundBlast submission requires the appropriate SoundBlast account/API or operational credentials; this build does not invent or fake an external distributor connection.
