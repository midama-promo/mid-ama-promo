# Mid-Ama Promo™ visual rebuild notes

## Design direction
A complete visual refresh inspired by contemporary music-distribution platforms, using a monochrome black/white palette, restrained red CTAs, glass surfaces, subtle grain, a transparent M.A™ glass-style wordmark, and responsive motion.

## Included
- Replaced the old image logo usage in shared logo components with the transparent M.A™ glass-effect wordmark.
- Added a persistent light/dark theme switch. Theme preference is stored locally in the browser and does not touch Supabase.
- Added a global viewport reveal system with alternating left/right/up entrance directions for public content, dashboards, panels, and cards.
- Refined buttons, forms, surfaces, navigation, borders, focus states, and hover transitions across public, admin, and client views.
- Added a motivational independent-artist manifesto section using the existing studio image.
- Preserved the Spotify playlist embed and two-direction DSP marquee from the prior iteration, and added Releases navigation.
- Kept the existing authentication modal and routing logic; login/signup implementation was not intentionally changed.
- Kept Supabase services, persistence/server code, release submission handlers, Resend mailer, and Render server configuration unchanged from the supplied previous redesign package.

## Build validation
The production build could not be run in this environment because dependency installation did not complete. Run `npm install` followed by `npm run build` and `npm run lint` locally before deploying. Test client release submission end-to-end in staging before publishing.

## Deployment safety
Keep the current Render environment variables and Supabase project configuration. Do not reset, recreate, or migrate the database as part of this visual update. The theme preference is browser-local and is separate from the release persistence layer.
