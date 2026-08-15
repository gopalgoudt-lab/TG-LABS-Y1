# TG Labs V6 — Infrastructure Execution Plan

## Current state

This kit prepares the application for infrastructure execution. It does **not** contain or invent:
- hosting credentials
- DNS credentials
- database passwords
- Razorpay live secrets
- OTP/SMS secrets
- WhatsApp credentials
- report-storage credentials
- LIS credentials

## Recommended deployment sequence

### A. Source
1. Put the project in a private GitHub repository.
2. Protect the main branch.
3. Enable dependency/security alerts.

### B. Staging
1. Create a staging PostgreSQL database.
2. Configure staging secrets.
3. Deploy the application.
4. Run migrations.
5. Seed synthetic data only.
6. Configure Razorpay test webhooks.
7. Configure test OTP/messaging providers.
8. Run the Phase 9 acceptance and security tests.

### C. Production
1. Create production PostgreSQL.
2. Configure private report storage.
3. Configure Razorpay Live.
4. Configure OTP/SMS, WhatsApp and email.
5. Configure DNS for tglabs.in.
6. Enable HTTPS.
7. Deploy the approved release.
8. Run production smoke tests.
9. Monitor first transactions.
10. Open traffic gradually.

## Infrastructure choices

A practical setup is:
- Next.js application on a managed container/Node host
- Managed PostgreSQL
- Private object storage for reports
- CDN/WAF in front of the application
- Managed secrets
- Durable background-job system
- Error and uptime monitoring

Use one vendor or multiple vendors based on TG Labs' budget, support and compliance requirements.

## Database migration gate

Before applying migrations:
- take backup
- verify migration is reviewed
- confirm rollback/forward-fix strategy
- use staging first
- avoid destructive changes during first production release

## DNS

Use:
- `tglabs.in` as canonical public domain
- `www.tglabs.in` redirect to canonical
- `staging.tglabs.in` for staging

Do not expose database/admin services directly to the public internet.

## Launch gate

Do not switch production traffic until:
- security P0 = 0
- P1 = 0 or explicitly accepted
- payment reconciliation passes
- private report access passes
- backup restore passes
- monitoring works
- business owner signs off
