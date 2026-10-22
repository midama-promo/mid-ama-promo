# Update notes — Mid-Ama Promo

Changes made to the uploaded project:

1. Client dashboard: added a Spotify for Artists claim guide with the official claim link and two persisted confirmation choices (claimed / not yet).
2. Backend/API: added an authenticated client-only endpoint to save the claim confirmation to the existing user record.
3. Dark mode: added higher-contrast dark charcoal/glass colours, readable neutral text, input contrast, and dark select options while preserving the glass aesthetic and semantic status colours.
4. Release status workflow: status updates from the admin release detail modal now dispatch the event consumed by the admin release list, so the list updates without a manual browser refresh.
5. Responsiveness: approval, completion, denial, and corrections endpoints no longer wait for the notification send promise before returning the updated release. Notification errors are logged without blocking the status response.

Validation note: dependencies could not be installed in this environment because npm install timed out, so a full TypeScript/Vite build could not be completed here. Please run `npm install` (or the project's supported package-manager install) and `npm run lint` / `npm run build` before production deployment.
