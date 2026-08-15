# TG Labs V6 — Phase 9 Final QA & Launch Certification

This package defines the final release gate. It does not claim that external infrastructure, credentials, payment accounts, or third-party integrations have been tested from this environment.

## P0 — must be zero
- Cross-patient data access
- Privilege escalation
- Payment verification bypass
- Public report access
- Exposed secrets
- Authentication bypass
- Booking duplication that causes financial/operational harm

## P1 — must be resolved or explicitly accepted
- Broken checkout
- Incorrect pricing
- Incorrect slot capacity
- Failed webhook reconciliation
- Broken report delivery
- Critical mobile layout defects
- Critical SEO/indexing defects
- Production build failure

## Functional release tests

### Patient
- Search
- Test/package details
- Cart
- OTP
- Patient profile
- Family member
- Address
- Serviceability
- Slot selection
- Booking
- Payment
- Booking history
- Report access

### Technician
- Authentication
- Assignment visibility
- Collection status transitions
- Unauthorized access rejection

### Admin
- Role authorization
- Order management
- Test/package management
- Technician assignment
- Payment/reconciliation visibility
- Report publication

## Payment
- Successful payment
- Failed payment
- User cancellation
- Duplicate webhook
- Replayed webhook
- Signature mismatch
- Amount mismatch
- Refund flow

## Security
- Authentication tests
- Authorization tests
- IDOR tests
- XSS/input validation tests
- CSRF/cookie checks
- Rate-limit checks
- Secret scanning
- Dependency audit
- Error leakage checks
- File/report access checks

## Accessibility
- Keyboard-only navigation
- Visible focus
- Form labels
- Accessible errors
- Dialog focus management
- Color contrast
- Touch targets
- Screen-reader smoke test

## Performance
- Mobile Lighthouse/PageSpeed review
- Core Web Vitals review
- Image optimization
- JavaScript bundle review
- Third-party script review
- API latency review

## SEO
- Sitemap
- Robots
- Canonicals
- Metadata
- Structured data
- 404
- No private pages indexed
- Internal links

## Launch sign-off
Release only after:
- all P0 issues = 0
- all P1 issues = 0 or formally accepted
- staging acceptance passes
- backup/restore is verified
- monitoring is active
- payment reconciliation is tested
- business owner approves production release
