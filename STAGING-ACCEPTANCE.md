# TG Labs V6 — Staging Acceptance Test

## Customer
- [ ] Homepage loads on mobile and desktop
- [ ] Test search works
- [ ] Package selection works
- [ ] Cart totals are server-derived
- [ ] OTP login works
- [ ] Serviceability works
- [ ] Address creation works
- [ ] Slot availability is accurate
- [ ] Slot reservation expires correctly
- [ ] Booking is created once
- [ ] Razorpay test payment succeeds
- [ ] Failed payment does not falsely confirm booking
- [ ] Webhook is verified and idempotent
- [ ] Patient sees booking

## Operations
- [ ] Technician sees only authorized assignments
- [ ] Technician can update collection status
- [ ] Admin can manage authorized operations
- [ ] Unauthorized role access is rejected server-side

## Reports
- [ ] Synthetic report can be published
- [ ] Patient can access only their own report
- [ ] Report object is private
- [ ] Expired/invalid access is rejected
- [ ] Report download does not expose storage credentials

## Notifications
- [ ] Booking notification generated
- [ ] Sample-collected notification generated
- [ ] Report-ready notification generated
- [ ] Provider failures are retried safely

## Security
- [ ] No secrets in client bundle
- [ ] No secrets in logs
- [ ] HTTPS enabled
- [ ] Secure cookies enabled
- [ ] Rate limits enabled
- [ ] Input validation enabled
- [ ] Authorization tested
- [ ] Error messages do not expose internals

## Production gate
- [ ] No P0/P1 defects
- [ ] Database backup tested
- [ ] Rollback procedure tested
- [ ] Monitoring active
- [ ] DNS/SSL verified
- [ ] Business owner sign-off
