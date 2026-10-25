# Mid-Ama Promo™ Paystack integration

## Packages currently configured

- Free: R0/month; up to 50 new release submissions in any rolling 30-day window and 10 unique artist profiles.
- Starter: R99 per 30-day paid period; unlimited release submissions in any rolling 30-day window and up to 20 unique artist profiles.
- Pro: R449 per 30-day paid period; unlimited release submissions and artist profiles, subject to fair-use policy.

Each submitted Single, EP or Album counts as one release submission, regardless of track count. The server enforces the limits; changing frontend state cannot bypass them. Artist profiles are counted by unique artist name across the account's release metadata, including the registered artist name.

Only independent artist accounts are accepted; record-label accounts are not eligible for these plans.

Administrators can change any client account to Free, Starter, or Pro from the Clients & Artists admin area for testing/support. Admin-assigned paid plans last 30 days and do not create a Paystack transaction.

## Configure Paystack on the hosting server

1. In Paystack Dashboard, start in **Test Mode** and copy the **test secret key**. Do not share it in chat or put it in frontend code.
2. Add these environment variables to the server hosting `distro.midamapromo.co.za`:
   - `PAYSTACK_SECRET_KEY=sk_test_...` (server-only; do not prefix with `VITE_`)
   - `APP_URL=https://distro.midamapromo.co.za`
3. Redeploy/restart the server so it loads the new environment variables.
4. In Paystack Dashboard → **Developers → Webhooks**, add:
   - `https://distro.midamapromo.co.za/api/payments/paystack/webhook`
5. Test a Starter checkout and a Pro checkout in Test Mode. Confirm that the plan shown in the client dashboard changes only after a verified successful payment, and confirm a failed/cancelled payment leaves the account on its previous plan.
6. Once the tests pass and Paystack has approved the business for live payments, replace the test key with the live secret key in the hosting environment and use the live dashboard's webhook configuration.

## Payment behavior

- The server chooses the amount and plan entitlements; the browser cannot set a custom price.
- Payment initialization and transaction verification happen server-side.
- The webhook verifies Paystack's HMAC SHA-512 signature against the original request body.
- The server checks successful status, ZAR currency, expected amount, account email, and account ID before activation.
- Successful payments grant 30 days. A paid plan does **not** auto-renew; the client must pay again to renew. If you later want automatic recurring billing, it must be built and tested separately using a supported Paystack subscription flow.
- Plan fields are stored alongside the existing user records in the existing database. This patch does not reset or reseed existing client/release data.

## Important deployment note

The ZIP includes the integration code, but payments will not go live until the server environment variables and Paystack webhook are configured in the hosting provider. Never commit a real Paystack secret key to this repository or put it in a Vite frontend variable.
