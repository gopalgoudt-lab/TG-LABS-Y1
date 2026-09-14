# Phase 4Q — Hyderabad CBC Test SEO

Baseline: `46bd9b2a1b453238ad053d7e66bde21500528087` (main after Phase 4P / PR #81).

## Scope
- Add `/cbc-test-hyderabad` as a crawlable CBC / Complete Blood Count discovery page.
- Add conservative title, description, canonical URL and Open Graph metadata.
- Add breadcrumb structured data.
- Keep availability, partner eligibility, pricing and home collection explicitly dependent on the live TG Labs catalog, pincode and current booking eligibility.
- Link to the existing CBC health guide and from the Hyderabad diagnostic discovery hub.
- Include the page in the dynamic sitemap.
- Add focused Phase 4Q regression coverage and `test:phase4q-seo`.

## Safety boundaries
- No Prisma schema or migration changes.
- No database or Production data changes.
- No partner activation or serviceability changes.
- No booking, payment, OTP, report or messaging operations.
- No Firebase, Razorpay, WhatsApp, DNS or Vercel configuration changes.
- No guaranteed CBC availability, price, service area or home-collection claim.
- Keep the PR open and unmerged pending automatic Preview/build validation and separate merge approval.
