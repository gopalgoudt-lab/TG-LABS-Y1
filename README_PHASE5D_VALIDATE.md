# Phase 5D validation checklist

Before merge, validate the Vercel Preview for `/c-peptide-test-hyderabad`:

- HTTP 200 and successful build.
- Document title resolves to `C-Peptide Test in Hyderabad | TG Labs` exactly once through the root title template.
- Canonical points to the Production route.
- Robots metadata is index/follow on the page (Preview may additionally receive Vercel noindex headers).
- Open Graph metadata and BreadcrumbList are present.
- Diabetes hub links to C-peptide; C-peptide links to related diabetes discovery pages.
- Sitemap includes the C-peptide route.
- No database, catalog, partner, serviceability, booking, payment or configuration changes.
