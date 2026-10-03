MID-AMA PROMO — Artist Profile Option Fix

Replace this file in the existing GitHub repository:
src/components/client/UploadReleaseModal.tsx

The fix adds explicit options for Spotify and Apple Music:
- Use existing profile → requires a valid URL.
- Create new profile → URL is not required and the release records a profile-creation request.

The same options are available for:
- Primary artists
- Featured/additional artists
- EP/Album per-track primary artists
- EP/Album per-track featured artists

No database schema, Supabase persistence, authentication, or server persistence code is changed by this patch.
