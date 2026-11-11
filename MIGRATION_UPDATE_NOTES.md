# Mid-Ama Promo portal transition update

This update retires the legacy client-facing release submission workflow and directs artists to:

https://user.midamapromo.co.za/

## Changes
- Removed public Sign Up controls from desktop navigation, mobile navigation, the hero section, and footer.
- Removed public artist self-registration and invite activation UI/API flows. The legacy public registration endpoints now return HTTP 410.
- Preserved Sign In and its existing email OTP flow.
- Preserved administrator-created client accounts so the admin can continue onboarding clients. Those clients sign in with their registered email.
- Removed the legacy client release upload/edit/resubmission UI and modal.
- Disabled the legacy client release creation and corrections-resubmission API endpoints (HTTP 410).
- Added a migration notice and link to the new artist portal on every client dashboard.
- Added a prominent announcement and portal link to the public website.
- Removed the temporary service interruption notice and old VEVO promotion banner.
- Removed the VEVO application UI and disabled VEVO application create/update endpoints. Existing application records are retained for read-only status checks.
- Left the video-submission panel in place for existing approved VEVO clients and retained the admin video-submission review panel.
- Existing catalogue and release records are not deleted or migrated by these changes.

## Important
The old website remains the Mid-Ama Promo label/catalogue and account-history portal. New distribution submissions should be made on the new artist portal.
