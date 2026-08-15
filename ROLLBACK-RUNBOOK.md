# TG Labs V6 — Rollback Runbook

## Application rollback
1. Stop the rollout.
2. Identify the last known-good deployment.
3. Roll back the application release.
4. Verify health endpoint and critical pages.
5. Verify database connectivity.
6. Test patient login and booking read-only flow.

## Database rollback
Do not blindly reverse migrations in production.

Preferred strategy:
- Make backward-compatible migrations.
- Deploy application compatibility first.
- Take a backup before destructive schema changes.
- Restore from backup only under an approved incident procedure.

## Payment incident
If payment verification is uncertain:
- Do not manually mark an order paid from the browser.
- Reconcile against the payment provider.
- Preserve webhook/event records.
- Prevent duplicate fulfillment.

## Report incident
If report access is suspected to be exposed:
- Disable report-publication/access endpoint if necessary.
- Rotate relevant storage credentials.
- Review audit logs.
- Revoke affected signed URLs.
- Investigate access before re-enabling.
