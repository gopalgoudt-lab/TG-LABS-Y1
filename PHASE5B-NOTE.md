# Phase 5B — Hyderabad Glucose Tolerance Test SEO

## Scope
- Add `/glucose-tolerance-test-hyderabad` as a Hyderabad-focused glucose tolerance test discovery landing page.
- Provide canonical, index/follow, Open Graph and breadcrumb structured-data metadata.
- Link the page from the diabetes-test hub and Hyderabad diagnostic-test hub.
- Include the page in the sitemap.
- Add Phase 5B regression coverage and a dedicated package test command.

## Safety and release safeguards
- Discovery/SEO scope only; this phase does not guarantee a particular test, partner, price, pincode or home-collection slot.
- No Prisma schema or migration changes.
- No Production or staging data writes.
- No catalog activation or partner-eligibility changes.
- No pincode/serviceability changes.
- No booking, payment, OTP, report or WhatsApp workflow changes.
- No Firebase, Razorpay, DNS or Vercel configuration changes.
- Keep this branch/PR unmerged until Preview deployment and Phase 5B validation pass and explicit merge approval is given.

## Validation
Run `npm run test:phase5b-seo`, typecheck/build validation, then verify the Preview page, canonical/robots/Open Graph metadata, breadcrumb structured data, internal links and sitemap inclusion before merge.
