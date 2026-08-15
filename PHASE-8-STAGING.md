# TG Labs V6 — Phase 8 Staging Deployment Package

This package prepares the application for a controlled staging deployment. It does not contain live credentials.

## Staging architecture

Browser
  -> HTTPS / CDN / hosting
  -> Next.js application
  -> server-side API routes
  -> PostgreSQL
  -> private report storage
  -> payment provider
  -> OTP / messaging providers

## Required staging secrets

Copy `.env.staging.example` to the staging secret manager. Never commit the filled file.

Required:
- APP_URL
- DATABASE_URL
- SESSION_SECRET
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- OTP provider credentials
- SMTP credentials
- WhatsApp/SMS credentials
- private report-storage credentials
- LIS credentials if enabled

## Deployment order

1. Create an isolated staging database.
2. Apply schema migrations.
3. Seed only synthetic/test data.
4. Configure staging environment variables.
5. Deploy the application.
6. Configure HTTPS and DNS.
7. Configure Razorpay test-mode webhook endpoint.
8. Configure OTP test provider.
9. Configure private report storage.
10. Run the staging acceptance checklist.
11. Fix all P0/P1 issues.
12. Take a backup and test restore.
13. Only then prepare production.

## Do not use real patient/medical data in staging unless the organization's approved data-governance process explicitly permits it.
