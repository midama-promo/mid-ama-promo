# Mid-Ama Promo Distro — Security & Feature Fixes

## Persistence protection
No code in `server/remote.ts` was changed. The Supabase remote persistence mechanism, state storage, initialization, update logic, and storage/auth helpers remain untouched. No database reset, migration, table recreation, or destructive data operation was added.

## Changes
- Replaced forgeable `userId:random` application session tokens with signed, expiring HMAC tokens.
- Restricted admin authorization to `remoabetswemolefi@gmail.com`.
- `/api/assets/*` verifies signed sessions before resolving private user identity.
- C-Line and P-Line are fixed to `[current year] Mid-Ama Promo`.
- Artist Spotify/Apple Music URLs are required for release-level artists.
- EP/Album song primary artist + Spotify + Apple Music profile links are required per song; added artists require their own links.
- Integrated the new Mid-Ama Promo logo and browser favicon.
- Preserved the existing 14-day rule, instant submission update, admin client-access feature, and Royalty Dashboard link.
