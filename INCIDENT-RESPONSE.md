# TG Labs V6 — Production Incident Response

## Severity P0
Examples:
- patient data exposure
- authentication bypass
- payment verification bypass
- public medical reports
- leaked production secrets

Immediate actions:
1. Stop affected functionality.
2. Preserve logs/audit records.
3. Rotate compromised secrets.
4. Disable affected endpoints if necessary.
5. Assess scope.
6. Restore secure service.
7. Follow TG Labs' approved legal/privacy incident process.

## Severity P1
Examples:
- checkout unavailable
- booking creation failing
- report publication failing
- widespread notification failures

Actions:
1. Alert on-call owner.
2. Identify affected component.
3. Roll back if appropriate.
4. Reconcile orders/payments.
5. Verify recovery.
6. Document root cause.

Never put patient medical details, OTPs or payment secrets into incident tickets or chat channels unless an approved secure process explicitly requires it.
