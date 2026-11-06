# Mid-Ama Promo — Feature Update and Repair

## Pre-save page repair
- Fixed the malformed JSX on the artwork background element that prevented the public pre-save page from compiling/rendering.
- Removed the undefined `ArrowLeft` reference and removed the Mid-Ama Promo back/navigation link from generated pre-save pages.
- Existing Feature.fm / SoundBlast and Shift Music Linkfire host handling remains in the Smart Pre-Save manager.

## VEVO channel applications
- Clients can apply for a VEVO channel and view Pending, Approved or Rejected status.
- Admins can review applications and approve or reject them.
- New application email notifications continue to use the existing Resend mail transport and are addressed to midnightamapiano@yahoo.com.

## Video submission workflow (new)
- A separate music-video submission window is displayed to clients only after at least one of their VEVO applications is Approved.
- Clients can submit a video title, artist/channel name, video type, director, language, release date, explicit-content flag, notes and a video master (MP4, MOV or M4V; maximum 500 MB).
- Video uploads use the existing private uploads / configured R2 storage approach.
- Video submissions are stored additively in the existing application-state JSON document as `videoSubmissions`; existing users, releases, catalogue, royalties, and VEVO applications are retained.
- Admins can open the uploaded video, add a note, and set status to Approved, Corrections Required, Rejected or Delivered.
- Clients can see their submission statuses and admin notes in the same dashboard section. Video submission status emails use the existing Resend configuration.
- New video submission email notifications are sent to midnightamapiano@yahoo.com.

## Data safety
- No database reset, user recreation, release replacement, or destructive migration was added.
- `videoSubmissions` is a new additive state collection. Existing persisted arrays are read as-is; older state documents without this property are migrated in memory to an empty array and then retained through the existing persistence mechanism.
- No existing email campaign system was replaced or modified.

## Verification
- TypeScript/TSX syntax transpilation passed for all modified source files.
- A complete dependency-backed Vite build could not be run in this environment because `npm install` timed out. Run `npm install` and `npm run build` in the deployment environment before publishing.
- Ensure the existing `DATABASE_URL`, R2 credentials, `RESEND_API_KEY` and `EMAIL_FROM` environment variables are configured. The video upload path requires the configured R2 storage to persist files across deployments; local uploads are only suitable for development.
