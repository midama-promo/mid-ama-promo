# Cloudflare R2 implementation

- Cloudflare R2 remains the private object store for new audio, artwork and documents.
- Objects are stored with an `r2:` reference and delivered through short-lived signed URLs after application authorization.
- New uploads require `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`.
- Legacy file references from a former storage provider are not silently rewritten or deleted. Any legacy asset migration must be separately reviewed and verified.
