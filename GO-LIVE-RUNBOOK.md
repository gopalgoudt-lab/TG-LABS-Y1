# TG Labs V6 — Go-Live Runbook

1. Freeze production content changes.
2. Confirm backup and restore point.
3. Confirm all live secrets are present in the production secret manager.
4. Apply backward-compatible database migrations.
5. Deploy the application.
6. Verify HTTPS/DNS.
7. Verify `/api/health`.
8. Verify authentication.
9. Verify test search.
10. Create one controlled booking.
11. Verify live payment and server-side confirmation.
12. Verify webhook.
13. Verify notification.
14. Verify technician assignment.
15. Verify secure report access using an approved synthetic/controlled record.
16. Monitor errors, payments and booking volume.
17. Keep rollback release available.

Do not perform destructive migrations during the first release window.
Do not use real patient records for testing unless approved by TG Labs' data-governance process.
