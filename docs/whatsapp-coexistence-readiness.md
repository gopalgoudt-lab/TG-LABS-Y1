# WhatsApp coexistence readiness (development only)

## Existing integration
- Outbound booking and workflow template messages use `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`.
- Incoming webhook endpoint is `/api/whatsapp/webhook`.
- This branch adds verification of Meta's `X-Hub-Signature-256` using the raw request body and `META_APP_SECRET`. Missing secret rejects POST requests (503); invalid signature rejects them (401).
- Webhook GET challenge verification still uses `WHATSAPP_VERIFY_TOKEN`.

## Before any deployment
1. Add `META_APP_SECRET` as a server-only secret in the correct Vercel environment, using the Meta app's App Secret. Never paste it in GitHub, screenshots, or chat.
2. Run typecheck and webhook tests for valid, missing, and invalid signatures. This branch has **not** been CI-verified.
3. Verify the active Meta app and WABA ownership; +91 96526 03022 currently appears unverified in two WABAs. Do not delete or migrate entries without confirmation from Meta.
4. Determine whether TG LABS is eligible to initiate **WhatsApp Business App coexistence** via a supported Embedded Signup flow or an authorized solution provider. A standard Cloud API phone-number OTP screen is not a substitute.
5. Obtain the official coexistence QR/code only from the authorized onboarding flow and complete it from the existing WhatsApp Business app, preserving chats as appropriate.
6. Confirm WABA, phone number ID, webhook subscription, signed events, templates, and real end-to-end delivery in a controlled test before enabling patient notifications.

## Release safety
- Keep this PR **Draft** and do not merge or deploy until the secret and test coverage are ready.
- Do not replace `WHATSAPP_PHONE_NUMBER_ID` with an unverified number.
- Do not disconnect the WhatsApp Business mobile app or alter the already registered +91 99666 00679.
