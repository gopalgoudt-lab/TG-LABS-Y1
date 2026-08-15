# TG Labs V6 — Monitoring & SLO Baseline

Suggested initial service objectives should be finalized with actual traffic and business requirements.

Monitor:
- availability
- API p50/p95/p99 latency
- 4xx/5xx rate
- database errors
- booking success rate
- payment success rate
- webhook processing delay
- report publication latency
- notification delivery
- authentication failure rate

Alert on:
- sustained 5xx spikes
- payment/webhook failures
- database unavailability
- report access failures
- suspicious authentication activity
- backup failure
- certificate/DNS issues

Do not send patient medical content, OTPs or secrets to monitoring systems.
