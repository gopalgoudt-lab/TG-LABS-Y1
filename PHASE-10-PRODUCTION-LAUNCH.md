# TG Labs V6 — Phase 10 Production Launch Package

Phase 10 converts the completed QA/release gates into an operational production-launch package.

This package does not contain live credentials and does not claim that external hosting, DNS, payment, messaging, storage or LIS services are connected.

## Production topology

Internet
  -> DNS/CDN/WAF
  -> HTTPS
  -> Next.js application
  -> PostgreSQL
  -> private report storage
  -> Razorpay
  -> OTP/SMS
  -> WhatsApp/email
  -> LIS (if approved)

## Launch sequence

1. Provision production infrastructure.
2. Configure DNS and TLS.
3. Configure production secrets in the secret manager.
4. Create production database.
5. Take a baseline backup.
6. Apply reviewed migrations.
7. Deploy the release candidate.
8. Run health checks.
9. Enable Razorpay live webhook.
10. Verify authentication and booking smoke tests.
11. Verify payment reconciliation.
12. Enable notifications.
13. Monitor the first controlled transaction.
14. Open traffic gradually.
15. Keep the previous release available for rollback.

## Do not launch until

- P0 security issues = 0
- P1 issues = 0 or formally accepted
- backup/restore verified
- live payment account approved
- report storage access verified
- legal/business content approved
- support escalation process ready
