# Phase 3A — Existing Site Migration & Content Mapping

Prepared from `main` at `729825e1d2be16ff1ae55704021c0ef21bb7f65b`.

This document inventories public routes visible on the legacy TG Labs site and maps them to the Next.js platform. It does not authorize or perform DNS, Production configuration, or Production data changes.

## Legacy route map

| Legacy route | Legacy purpose | New route | Migration action |
| --- | --- | --- | --- |
| `/` | Home, health packages, test discovery, home-collection booking entry | `/` | Keep canonical home |
| `/appointment` | Legacy appointment/OTP booking entry | `/` | Permanent redirect to new catalog-first booking journey |
| `/book-appointment` | Common legacy booking alias | `/` | Permanent redirect |
| `/tests` | Legacy tests navigation | `/` | Permanent redirect to searchable catalog |
| `/health-check-packages` | Legacy health package listing | `/` | Permanent redirect to catalog |
| `/health-check-packages/*` | Legacy package detail family | `/` | Permanent redirect to catalog |
| `/package-a` through `/package-d` | Legacy package shortcuts | `/` | Permanent redirect to catalog |
| `/reports` | Legacy report login/download page | `/patient` | Permanent redirect to authenticated patient portal |
| `/download-report` | Common legacy report alias | `/patient` | Permanent redirect |
| `/contact-us` | Legacy contact details and operating hours | `/contact-us` | Recreated as a native Next.js public page |

## Content carried forward

The legacy public site prominently communicated home sample collection, Hyderabad/Secunderabad service, operating hours, phone/email contact, health packages, test discovery, appointment booking and report download. Phase 3A preserves those user intents through the new catalog, patient portal and contact page rather than copying legacy booking/payment forms.

## SEO and launch safety

- Redirects are permanent and internal only.
- No redirect points to `/admin`, `/api`, payment handlers or mutation endpoints.
- Public canonical metadata remains rooted at `https://tglabs.in`.
- `robots.txt` allows the public site while disallowing admin, API, checkout and patient-private areas.
- `sitemap.xml` contains only public indexable routes.
- DNS/domain cutover remains a separate launch authorization.

## Validation checklist

1. Build succeeds in automatic Preview.
2. Legacy routes return permanent redirects to the mapped destinations.
3. `/contact-us`, `/sitemap.xml` and `/robots.txt` render in Preview.
4. Public homepage and compare-labs routes remain reachable.
5. No Production data/configuration, DNS or manual deployment changes are made during Phase 3A preparation.
