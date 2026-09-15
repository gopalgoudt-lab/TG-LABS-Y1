# Phase 5A — Hyderabad RBS SEO expansion

Baseline: Production-verified `main` at `1c834ae1459cae8780bbfb41cb761ac0792d405c` (Phase 4Z / PR #91).

## Scope
- Add `/random-blood-sugar-test-hyderabad` discovery/SEO page.
- Add canonical, index/follow, Open Graph and breadcrumb structured data.
- Link RBS from the diabetes and Hyderabad diagnostic-test hubs.
- Cross-link RBS with FBS, PPBS and HbA1c discovery pages.
- Add RBS to sitemap.
- Add Phase 5A regression coverage and package test script.

## Safety boundaries
- No Prisma schema or migration changes.
- No Production or staging data writes.
- No catalog item or partner activation changes.
- No pincode/serviceability changes.
- No booking, payment, OTP, report or WhatsApp workflow changes.
- No Firebase, Razorpay, DNS or Vercel configuration changes.
- SEO/discovery copy does not guarantee a test, partner, price, pincode or home-collection slot; current eligibility remains determined by the live catalog and booking flow.

## Release gate
Keep Phase 5A unmerged until the final Preview build and regression validation pass and separate merge approval is given. After merge, perform strictly read-only Production verification.
