# TG LABS WhatsApp Business App coexistence: implementation gate

Status: **design / blocked from activation**. This document does not implement Meta login, generate a QR code, or connect a phone number.

## Confirmed Meta configuration (owner-reviewed screenshots, 2026-10-19)
- Meta app ID: `904595392273250`
- Facebook Login for Business configuration: `1779042243370993` ("TG LABS Coexistence")
- Login variation: WhatsApp Embedded Signup
- Product: WhatsApp Cloud API
- Access token: system-user; expiry option Never
- WhatsApp accounts asset selected
- Permissions: `whatsapp_business_management`, `whatsapp_business_messaging`
- Web Quickstart reviewed; sample SDK snippets have **not** been installed.
- Target existing WhatsApp Business mobile-app number: +91 96526 03022
- Existing Meta records show this number as unverified in two WABAs. No WABA or phone-number mutation is authorized.

## Must establish before writing a launch button
1. Confirm from current official Meta documentation that this app/business is eligible to onboard an **existing WhatsApp Business App** number with coexistence, and the supported Embedded Signup variation, session-info event payload, and any coexistence-specific `extras`/feature values. Generic Facebook Login Quickstart is not sufficient.
2. Verify the allowed JavaScript SDK domain, Facebook Login for Business settings, and actual production TG LABS origin. Do not assume a URL.
3. Resolve the conflicting unverified phone entries with Meta guidance, without deleting, registering by ordinary OTP, or disconnecting the mobile app.
4. Define an administrator-only launch entry point with verified server-side authorization. Do not expose onboarding controls to patients.
5. Add a short-lived, one-time server-side state/nonce and validate origin and returned event metadata; do not log authorization codes, access tokens, phone numbers, or customer chat data.
6. Exchange authorization codes on the server with the Meta app secret; store any resulting credentials only in an approved secret store. Do not put credentials in client-side JavaScript or commit them.
7. Show the official Meta-provided QR/code only after successful eligible onboarding. Never invent or manually generate a coexistence QR.
8. Require explicit operator confirmation before changing `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, WABA subscriptions, or patient notification routing.
9. Validate signed webhook receipt, account/number ownership, templates, message delivery, and preservation of WhatsApp Business mobile-app access with non-patient test data.

## Release gates
- PR #309's focused webhook signature tests passed on GitHub Actions; repository-wide TypeScript checking previously failed on unrelated existing test files and is **not** cleared.
- Before deploying PR #309, configure `META_APP_SECRET` in the target Vercel environment; its webhook POST handler fails closed (503) without it.
- No signup launcher, OAuth exchange endpoint, QR display, Meta account change, production secret update, merge, or deployment is included in this documentation commit.
