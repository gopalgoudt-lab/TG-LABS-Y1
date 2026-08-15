# Production Smoke Test

Use an approved controlled test account/order.

1. Open https://tglabs.in
2. Verify HTTPS and canonical URL.
3. Search for a known test.
4. Open test details.
5. Start booking.
6. Authenticate.
7. Verify serviceability.
8. Select an available slot.
9. Confirm server-calculated amount.
10. Complete a controlled payment.
11. Verify server-side payment confirmation.
12. Verify order appears in patient portal.
13. Verify technician workflow if the controlled booking is operationally approved.
14. Verify notification.
15. Verify controlled report access if report workflow is enabled.
16. Confirm no sensitive data appears in browser console or URLs.

If any payment, authorization or report-security test fails, stop the rollout.
