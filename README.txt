Mid-Ama Promo — EP/Album Track Artist Controls Fix

This patch updates only:
src/components/client/UploadReleaseModal.tsx

Changes:
- EP/Album track page now has separate “Add Primary Artist” and “Add Featured Artist” buttons.
- “Add Primary Artist” adds another primary-artist row instead of a featured artist row.
- Multiple primary artists are preserved in track artistProfiles with role=primary.
- “Add Featured Artist” continues to add a featured artist row.
- Existing profile / create-new-profile controls work independently for each primary and featured artist.
- Existing single-primary-artist data remains backward compatible.
- Draft save/restore preserves the new primary artist list.

No database, Supabase, persistence, authentication, or server files are changed by this patch.
