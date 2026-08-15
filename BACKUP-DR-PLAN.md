# TG Labs V6 — Backup & Disaster Recovery

## Backups

- Automated database backups
- Appropriate retention schedule
- Encrypted backups
- Separate backup access controls
- Periodic restore tests

## Recovery

For a database incident:
1. Stop risky writes if necessary.
2. Identify latest valid backup.
3. Restore into an isolated environment.
4. Validate schema and critical records.
5. Reconcile orders/payments created after the backup.
6. Switch traffic only after validation.

For application outage:
- Roll back to the last known-good release.
- Verify database compatibility.
- Run smoke tests.
- Monitor recovery.

Recovery objectives should be agreed with TG Labs management and documented as RTO/RPO targets.
