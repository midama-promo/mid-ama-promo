# Mid-Ama Promo Smart Pre-Save Campaign Update

## What changed

- Separated pre-release platform action URLs (`preSaveLinks`) from post-release direct store destinations (`dspLinks`).
- The Linkfire/Feature.fm signed action endpoints are no longer imported as final DSP Listen URLs.
- The admin campaign editor now captures a release date, pre-save action URLs, and direct DSP URLs for the released track.
- Existing campaign records can be edited in place to populate the new fields; the existing record IDs and slugs are retained.
- The public page switches from **Pre-save** to **Listen** on the configured release date, using the South African calendar date (`Africa/Johannesburg`).
- Listeners can confirm completion after returning from the external pre-save flow. The server records anonymous listener status and the admin campaign list displays the number of confirmations.
- Public campaign responses no longer expose the anonymous visitor-ID map and are sent with `Cache-Control: no-store`.

## Important provider limitation

The existing integration imports a Shift Music / Linkfire landing page but does not have a Shift/Linkfire webhook or DSP OAuth callback configured for Mid-Ama Promo. An external provider may return a listener to the original Linkfire page after its OAuth flow. Mid-Ama cannot intercept or verify that provider-side completion without an official callback/webhook or an independently integrated platform authorization flow.

Accordingly, the new **I have completed my pre-save** action records a listener confirmation, not a provider-verified pre-save. A click alone is recorded only as `started` and never marked as completed.

## Admin setup for each campaign

1. Edit an existing campaign or create a new one.
2. Keep the Shift/Linkfire URL as the metadata source only.
3. Enter the actual platform pre-save action URLs in the pre-save field (one `Store|URL` per line).
4. Enter each direct DSP release URL in the Listen field (one `Store|URL` per line). Do not paste the Linkfire landing page or its signed action endpoint as a Listen URL.
5. Set the release date and save.

On the release date, the public page automatically changes to the direct store destinations.

## Compatibility and verification

- No database reset, table replacement, or persistence architecture change was introduced.
- New fields are optional in the persisted JSON model so existing campaign records remain readable.
- TypeScript source transpilation/syntax checks were run for the modified server and React files.
- `npm install --no-audit --no-fund` timed out in this environment; therefore the full dependency-backed TypeScript check and Vite production build could not be completed here.
