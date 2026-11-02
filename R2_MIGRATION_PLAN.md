# Temporary portal storage boundary

New uploads are stored in Cloudflare R2. This package does not connect to Supabase or any previous production storage provider. Existing legacy object references are left untouched in any external data source and are not imported into Neon automatically.

If a separate migration is later approved, it must inventory source objects, verify destination object counts and sizes, test downloads through the portal, and retain a rollback copy. No legacy bucket or customer object should be deleted as part of this package build.
