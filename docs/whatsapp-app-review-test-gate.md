# WhatsApp App Review: Super Admin test-message gate

Implemented on **Draft PR #309 only**, not deployed or enabled.

Endpoint: `POST /api/admin/whatsapp-review-test`. It is **disabled by default** and returns 503 unless `WHATSAPP_REVIEW_TEST_ENABLED=true`.

Before enabling in an isolated Preview environment, an operator must:
1. Verify the Meta sender phone ID is the **Meta test sender**, not either TG LABS live/unverified number ID. Configure `WHATSAPP_REVIEW_TEST_PHONE_NUMBER_ID` accordingly.
2. Set server-only `WHATSAPP_REVIEW_TEST_ACCESS_TOKEN` to a Meta test token, and `WHATSAPP_REVIEW_TEST_RECIPIENT` to the single opted-in/test-recipient E.164 number in digits only.
3. Set `WHATSAPP_REVIEW_SUPER_ADMIN_UID` to the exact Firebase UID of the TG LABS owner. Ordinary ADMIN permission is **not sufficient**.
4. Set `WHATSAPP_REVIEW_TEST_ORIGIN` to the exact Preview origin (scheme + hostname; no trailing slash).
5. Keep all settings Preview-only and disable the endpoint after recording. Never paste tokens into chat, source code, screenshots, or client-side JS.

The endpoint requires a valid signed admin session cookie, exact Super Admin UID, exact Origin header, and explicit JSON `{"confirm":"SEND_REVIEW_TEST"}`. It sends only Meta's `hello_world` template to the single server-configured test recipient. It never accepts a caller-supplied phone number or message and never returns a message ID.

**Not yet complete:** there is no UI, no demonstration recording, no Meta approval, and no test execution proof. Do not claim App Review evidence is complete. Before enabling, implement durable per-admin rate limiting and audit logging and verify that Meta Graph API version and template remain supported. The endpoint is a restricted foundation, **not a production-ready sending service**.

For Meta's messaging review video, capture the TG LABS admin interface initiating a test send and the test device receiving it. For management permission, a **separate real template-creation demonstration** is required. Neither is implemented by this endpoint.

This does not launch Embedded Signup, modify a WABA, register a phone, or affect the WhatsApp Business mobile app on +91 96526 03022.
