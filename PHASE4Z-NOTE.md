# Phase 4Z — Hyderabad PPBS SEO

Baseline: Production-verified `main` at `2a5b41766e8d5c8ce6e233f3fe208e2d519f4f48` (Phase 4Y / PR #90).

## Scope
- Add `/postprandial-blood-sugar-test-hyderabad` discovery/SEO page.
- Add canonical, index/follow, Open Graph and breadcrumb structured data.
- Link PPBS from the diabetes and Hyderabad diagnostic-test hubs.
- Cross-link PPBS with FBS and HbA1c discovery pages.
- Add PPBS to sitemap.
- Add Phase 4Z regression coverage and package test script.

## Safety boundaries
- No Prisma schema or migration changes.
- No Production or staging data writes.
- No catalog item or partner activation changes.
- No pincode/serviceability changes.
- No booking, payment, OTP, report or WhatsApp workflow changes.
- No Firebase, Razorpay, DNS or Vercel configuration changes.
- SEO/discovery copy does not guarantee a test, partner, price, pincode or home-collection slot; current eligibility remains determined by the live catalog and booking flow.

## Release gate
Keep Phase 4Z unmerged until the final Preview build and regression validation pass and separate merge approval is given. After merge, perform strictly read-only Production verification.
