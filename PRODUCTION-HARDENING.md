# TG Labs V6 — Phase 7 Production Hardening

Phase 7 prepares the application for staging/production. No live credentials are included.

## Required production configuration

- DATABASE_URL
- SESSION_SECRET (strong random secret)
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- OTP provider credentials
- SMTP credentials
- WhatsApp provider credentials
- Private report storage credentials
- Report/LIS integration credentials
- APP_URL

## Security

- Enforce HTTPS in production.
- Use secure, httpOnly, SameSite cookies.
- Keep secrets server-side.
- Enable database row-level authorization.
- Apply least-privilege roles.
- Rate-limit OTP, login, booking and payment endpoints.
- Validate all input server-side.
- Verify Razorpay signatures and webhook events server-side.
- Make payment/webhook processing idempotent.
- Never expose private report objects publicly.
- Never log OTPs, passwords, payment secrets or medical report contents.
- Use audit logs for privileged actions.

## Production readiness

Before launch:
1. Run a clean production build.
2. Run database migrations against a staging database.
3. Seed only non-sensitive test data in staging.
4. Configure backups and test restore.
5. Configure error monitoring.
6. Configure uptime monitoring.
7. Run accessibility, SEO and mobile QA.
8. Run payment test-mode scenarios.
9. Perform authorization tests for patient/technician/admin roles.
10. Switch to live payment credentials only after staging passes.

## Healthcare data

Use verified TG Labs policies for privacy, retention, consent, report access and deletion. Do not invent certifications, legal claims or medical guarantees.
