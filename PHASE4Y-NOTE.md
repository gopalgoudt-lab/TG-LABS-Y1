# Phase 4Y — Hyderabad FBS SEO

## Scope
- Add a crawlable `/fasting-blood-sugar-test-hyderabad` discovery page for fasting blood sugar / FBS search intent in Hyderabad.
- Add canonical, index/follow, Open Graph metadata and breadcrumb structured data.
- Link the page from the Hyderabad diagnostic-test hub and connect it to the existing diabetes and HbA1c discovery pages.
- Include the route in the dynamic sitemap.
- Add focused regression coverage and an npm test script.

## Safety boundaries
- No Prisma schema or migration changes.
- No Production or staging data writes.
- No catalog or partner activation changes.
- No pincode or serviceability changes.
- No booking, payment, OTP, report or WhatsApp workflow changes.
- No Firebase, Razorpay, DNS or Vercel configuration changes.
- Test availability, partner eligibility, pricing and home collection remain conditional on the live catalog, pincode and current booking eligibility.

## Baseline
`main` at `4479e01cdc66bb18353a9f3613955d0eaacb6445` after Phase 4X / PR #89.

Keep the PR open and unmerged until Preview/build validation completes and separate merge approval is given.
