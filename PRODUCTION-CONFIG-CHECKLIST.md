# Production Configuration Checklist

## Domain
- [ ] tglabs.in DNS access
- [ ] www redirect/canonical policy
- [ ] TLS certificate
- [ ] HSTS after HTTPS verification
- [ ] CDN/WAF configured

## Application
- [ ] APP_URL
- [ ] secure session secret
- [ ] production database
- [ ] error monitoring
- [ ] uptime monitoring

## Payments
- [ ] Razorpay live account/KYC
- [ ] live keys in secret manager
- [ ] webhook URL
- [ ] webhook secret
- [ ] reconciliation procedure
- [ ] refund procedure

## Authentication
- [ ] production OTP provider
- [ ] rate limits
- [ ] OTP expiry
- [ ] abuse monitoring

## Reports
- [ ] private storage
- [ ] signed/authorized access
- [ ] upload validation
- [ ] retention policy
- [ ] audit logging

## Notifications
- [ ] WhatsApp
- [ ] SMS
- [ ] email
- [ ] retry handling
- [ ] delivery monitoring
