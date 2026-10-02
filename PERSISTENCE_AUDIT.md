# Persistence Audit Notes

This build includes a fail-safe correction to the Gemini-generated persistence layer.

## Critical fixes

- Production refuses to start without `MID_AMA_DATA_DIR` or `MID_AMA_DB_FILE`.
- Uploads default under the configured persistent data directory unless `MID_AMA_UPLOADS_DIR` is explicitly set.
- A missing database is never replaced with `INITIAL_DB` during reads or mutations.
- A read failure never falls back to a stale in-memory database.
- If the primary database is unreadable, the server attempts recovery from `db.json.last_good` or rolling backups.
- If no valid recovery exists, the operation fails loudly instead of returning an empty database.
- `MID_AMA_DB_FILE` now determines the database directory used for backups when `MID_AMA_DATA_DIR` is not separately configured.

## Deployment requirement

A persistent volume/disk must be mounted and supplied through `MID_AMA_DATA_DIR` (or `MID_AMA_DB_FILE`). A local JSON database cannot survive destruction of the filesystem that contains it.

The application intentionally refuses to start in production when this is not configured. This is safer than silently starting with only the seeded administrator accounts.
