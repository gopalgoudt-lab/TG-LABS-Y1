# TG Labs V6 — Production Release Checklist

## Infrastructure
- [ ] Production hosting configured
- [ ] Production database created
- [ ] HTTPS active
- [ ] DNS verified
- [ ] Environment secrets stored in secret manager
- [ ] Backups configured
- [ ] Restore tested
- [ ] Monitoring configured
- [ ] Error alerting configured

## Integrations
- [ ] OTP provider approved/configured
- [ ] Razorpay live account/KYC complete
- [ ] Razorpay webhook configured
- [ ] Private report storage configured
- [ ] WhatsApp/SMS configured
- [ ] Email/SMTP configured
- [ ] LIS integration validated if used

## Business
- [ ] Test catalogue verified
- [ ] Package pricing verified
- [ ] Locations verified
- [ ] Collection service areas verified
- [ ] Slot capacity verified
- [ ] Refund/cancellation policy approved
- [ ] Privacy/terms approved
- [ ] Support contacts verified

## Release
- [ ] Production build succeeds
- [ ] P0 = 0
- [ ] P1 = 0 or accepted
- [ ] Security test passed
- [ ] Accessibility smoke test passed
- [ ] Mobile QA passed
- [ ] Payment reconciliation passed
- [ ] Report access passed
- [ ] Rollback tested
- [ ] Business owner sign-off

## Launch
- [ ] Deploy
- [ ] Smoke test homepage
- [ ] Smoke test search
- [ ] Smoke test booking
- [ ] Smoke test payment
- [ ] Smoke test report access
- [ ] Monitor first transactions manually
