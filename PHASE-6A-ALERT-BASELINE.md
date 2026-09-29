# TG Labs Phase 6A — Launch Alert Baseline

These are initial controlled-launch thresholds. Tune them after real traffic is available. Alerts must contain operational metadata only — never patient report content, OTPs, passwords, access tokens, payment secrets, or full request bodies.

## P0 — immediate response

- Health/database: /api/health returns 503 on 2 consecutive external probes (recommended probe interval: 1 minute).
- Security: confirmed authentication/authorization bypass, cross-patient data exposure, public report exposure, or leaked production secret: alert immediately on first confirmed event.
- Payment integrity: any confirmed server-side payment-signature/amount verification bypass: alert immediately and disable online payment flow.

## P1 — respond within 15 minutes

- Availability: 5xx responses >= 5 in 5 minutes AND >= 5% of requests, excluding expected health-check 503 during a known incident.
- Booking creation: >= 3 unexpected 5xx failures in 10 minutes. Do not count validation 4xx, idempotency responses, or deliberate rate-limit 429s as booking failures.
- Authentication abuse: >= 20 failed/rate-limited authentication attempts from one source in 10 minutes, or >= 100 across the service in 10 minutes. Never log OTP values.
- Razorpay webhook: >= 3 processing failures in 10 minutes once online payments are enabled. While online payment creation remains intentionally disabled, do not page for absence of payment traffic.
- Report access/publication: >= 3 unexpected 5xx failures in 10 minutes, or any confirmed ownership/access-control failure immediately escalates to P0.
- Notification delivery: >= 5 failed booking/status notifications in 15 minutes AND failure rate >= 20% where delivery receipts are available.

## P2 — investigate during operating hours

- API latency: p95 >= 2 seconds for 15 minutes on patient booking/catalog/serviceability APIs.
- Elevated client errors: 4xx rate >= 25% for 15 minutes after excluding expected authentication, validation, not-found, and rate-limit responses; investigate for broken UI/API contracts rather than paging automatically.
- AI report generation: >= 3 upstream 5xx/timeout failures in 30 minutes. Patient rate-limit 429s are not provider failures.
- Report publication latency: investigate reports remaining in a ready-to-publish operational state beyond the agreed business SLA; do not put medical content in alert payloads.

## Required alert dimensions

Record only the minimum needed: timestamp, environment, deployment/commit, route or operation name, HTTP status/error class, request/correlation ID, and aggregate count/rate. Hash or omit patient identifiers. Do not attach request/response bodies from patient, report, OTP, or payment routes.

## Controlled-launch checks

Before public traffic, verify an external monitor can observe /api/health, generate a synthetic non-patient alert, route it to the responsible operator, acknowledge it, and close it. Verify the incident and rollback runbooks are reachable. Record one successful alert drill and one database recovery drill before marking Phase 6A operational readiness PASS.
