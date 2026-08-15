# TG Labs V6 — Runtime Health Checks

Recommended endpoints/monitoring:

- `/api/health` — application and database reachability
- Payment webhook endpoint — provider connectivity/verification
- Notification worker health
- Report storage connectivity

Health endpoints must not reveal:
- database credentials
- environment variables
- patient data
- stack traces

Return a minimal status such as `{ "status": "ok" }` for healthy checks.
