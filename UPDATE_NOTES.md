# Update notes — Mid-Ama Promo

Changes made to the uploaded project:

1. Client dashboard: added a Spotify for Artists claim guide with the official claim link and two persisted confirmation choices (claimed / not yet).
2. Backend/API: added an authenticated client-only endpoint to save the claim confirmation to the existing user record.
3. Dark mode: added higher-contrast dark charcoal/glass colours, readable neutral text, input contrast, and dark select options while preserving the glass aesthetic and semantic status colours.
4. Release status workflow: status updates from the admin release detail modal now dispatch the event consumed by the admin release list, so the list updates without a manual browser refresh.
5. Responsiveness: approval, completion, denial, and corrections endpoints no longer wait for the notification send promise before returning the updated release. Notification errors are logged without blocking the status response.

Validation note: dependencies could not be installed in this environment because npm install timed out, so a full TypeScript/Vite build could not be completed here. Please run `npm install` (or the project's supported package-manager install) and `npm run lint` / `npm run build` before production deployment.

## Premium plan and private artist library (2026-11-02)

6. Pricing: removed the Pro R449/month tier and its listed benefits; renamed Starter to Premium while retaining the existing R99/month Premium-equivalent price and Starter features. Client billing and admin plan controls now show only Free and Premium. Legacy `pro` account records are treated as Premium while their existing plan expiry is still respected; the legacy value is not offered as a selectable plan.
7. Artist library: added an authenticated `/api/artists` endpoint that returns only the signed-in client's saved artists. After a new release is successfully saved, the server merges the artist names, Spotify/Apple Music URLs, and profile-creation request flags into that client's user record in Neon. No previous releases are scanned or imported.
8. Release form: clients can select saved artists from clickable artist chips or name suggestions. Selecting a saved artist restores its Spotify and Apple Music links / creation-request states. Newly submitted artists and profile associations become available in later submissions. Artists are private to the account that submitted them.

Validation for this update: 38 TypeScript/TSX files passed a syntax/transpilation check. `npm install` timed out again, so the full Vite build and dependency-backed TypeScript type-check could not be run. No live Neon or browser tests were run in this environment.

## Legacy Client Catalogue & Royalty Withdrawals

- Admins can create a standalone legacy catalogue record for a selected client using the release title, artist name(s), original release date, and royalty amount in ZAR.
- Cover artwork and master MP3 uploads remain optional; neither is required to create a catalogue record.
- Clients see their own legacy catalogue entries, including release dates and assigned royalty amounts, in their dashboard.
- Standalone catalogue royalties are included in the client's royalty balance alongside royalties assigned to portal releases. Linked catalogue entries are not double-counted.
- Clients can request any positive withdrawal amount up to their available balance. Pending requests reserve funds; paid requests deduct funds; rejected requests release the reserved balance.
- Withdrawal requests remain manageable by administrators in the existing Royalties & Withdrawals tab.
