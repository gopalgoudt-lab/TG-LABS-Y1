# TG Labs V6 — Security Test Plan

Run these tests against staging with synthetic accounts/data.

1. Create Patient A and Patient B.
2. Verify A cannot read B's booking, address, payment or report by changing IDs.
3. Verify a technician cannot call admin endpoints.
4. Verify a normal patient cannot call technician/admin endpoints.
5. Verify unauthenticated users cannot access private reports.
6. Attempt invalid/expired session cookies.
7. Attempt malformed IDs and unexpected input types.
8. Test HTML/script payloads in all user-controlled text fields.
9. Test OTP rate limiting and expiry.
10. Test repeated booking requests.
11. Test duplicate payment webhook.
12. Test webhook signature failure.
13. Test payment amount mismatch.
14. Check browser bundles and source maps for secrets.
15. Check server logs for sensitive data.
16. Attempt direct access to report-storage objects.
17. Test file upload limits and content validation.
18. Confirm audit events for privileged actions.

Record evidence for every failed test and block release for P0 findings.
