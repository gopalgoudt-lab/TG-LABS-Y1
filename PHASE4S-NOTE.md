# Phase 4S — Hyderabad Thyroid Test Expansion (TSH, T3 & T4)

## Baseline

- Repository: `gopalgoudt-lab/TG-LABS-Y1`
- Starting `main`: `4b30199f17b3bf6a8f6e3525dbfde9246f1b043e` (after Phase 4R / PR #83)
- Branch: `feature/phase-4s-thyroid-tsh-t3-t4-seo`

## Scope

- Expand `/thyroid-test-hyderabad` with crawlable TSH, T3 and T4 discovery paths and thyroid-specific FAQs.
- Add dedicated `/tsh-test-hyderabad`, `/t3-test-hyderabad` and `/t4-test-hyderabad` pages with conservative canonical, Open Graph and breadcrumb structured-data metadata.
- Add reciprocal internal links between the thyroid hub, the three focused pages, the Hyderabad diagnostic discovery hub and the existing thyroid health guide.
- Add all three focused pages to the dynamic sitemap.
- Add focused regression coverage and a `test:phase4s-seo` package script.

## Safety

- No Prisma schema or migration changes.
- No database, staging or Production data changes.
- No partner activation, catalog write, pricing, serviceability, booking, payment, OTP, report, WhatsApp, Firebase, Razorpay, DNS or Vercel configuration changes.
- No diagnosis, guaranteed test availability, fixed price, service area or home-collection claim.
- Availability, partner eligibility, pricing and home collection remain dependent on the live catalog, selected item, pincode and current booking eligibility.
- Keep the PR open and unmerged until automatic Preview/build validation completes and separate merge approval is given.
