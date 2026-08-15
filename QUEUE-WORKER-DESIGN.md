# TG Labs V6 — Queue & Worker Design

Suggested logical queues:

1. `notifications`
2. `payment-reconciliation`
3. `technician-dispatch`
4. `report-processing`
5. `scheduled-reminders`
6. `analytics`

Each job should include:
- unique job/idempotency key
- entity ID
- created timestamp
- retry count
- next-attempt timestamp
- status
- error classification

Do not put patient medical-report contents into queue metadata when an ID/reference is sufficient.

Failed jobs should move to a dead-letter queue for controlled review.
