# TG LABS Dashboard Visual Foundation — Design

Date: 2026-09-17
Status: Approved
Baseline: `ef38cfc22378364651a2bc2fb762aee3ed35c165`

## Goal
Create a reusable visual foundation that moves the existing TG LABS application toward the four approved visual references: Homepage, Patient Dashboard, Admin Dashboard, and Technician Dashboard, without changing existing business logic or security boundaries.

## Visual direction
Use clean white surfaces, TG LABS navy/blue/green accents, rounded cards, clear typography and hierarchy, attractive but compact operational panels, strong calls to action, and responsive mobile/desktop layouts.

## Shared foundation
Create reusable presentation primitives for a dashboard shell, sidebar/top navigation, responsive content container, KPI/stat cards, section panels and headings, status badges, quick-action tiles, table/panel presentation, and loading/empty/error states. Components receive data through props and stay independent of database access, authentication, payments, booking logic and partner activation.

## Future Homepage
The approved marketplace-style direction includes prominent test/package search, Hyderabad/serviceability context, prescription upload, partner comparison, health categories, offers/packages, family features, rewards, corporate/community programs, trust information and clear booking calls to action.

## Future Patient Dashboard
The approved direction includes bookings/rebooking, reports, health trends, family profiles, prescription upload, partner comparison, reminders, wallet/rewards, membership, offers, addresses, profile and support. This foundation adds presentation primitives only and does not add medical interpretation logic.

## Future Admin Dashboard
The approved direction includes bookings, revenue, patients, tests, home collections, partner/catalog management, serviceability, marketing, analytics, profitability, operations, technician management, system health, settings, roles and audit visibility. Existing admin authorization remains authoritative and no bypass is introduced.

## Future Technician Dashboard
The approved direction includes daily schedules, sample-collection status, routes, patient contact actions, barcode/sample tracking, lab drop-off, notifications, operational metrics and support. This foundation does not add routing integrations or alter collection workflows.

## Security and data boundaries
This phase must not modify Prisma schema/migrations, Neon data, catalog data, serviceability/pincodes, partner eligibility or booking activation, payment configuration, Firebase authentication, WhatsApp configuration, environment variables, secrets or Production deployment settings. It must not introduce a Preview or Production admin-login bypass. Illustrative mockup values must never be shipped as real operational metrics.

## Accessibility and responsive behavior
Interactive controls require visible keyboard focus and meaningful accessible labels. Status information must not rely on color alone. Mobile layouts must avoid page-level horizontal overflow; dense data uses an intentional responsive treatment rather than unreadably small text.

## Testing
Use focused regression tests for the shared visual foundation and run relevant repository build/type/lint/test checks for changed files. Verify core component contracts, semantic status variants and independence from Production-only configuration.

## Error handling
Presentation components explicitly support loading, empty and error states and never fabricate operational values when data is unavailable. Data-fetching and authorization errors remain responsibilities of consuming feature boundaries.

## Non-goals
Do not redesign all four pages in this phase. Do not add prescription AI, family-account data models, rewards, membership, report intelligence, routing, profitability calculations, marketing automation or new partner operations. Do not merge, deploy to Production, modify Production data or request Admin credentials.

## Release process
`feature branch -> tests -> unmerged PR -> exact-head Vercel Preview -> validation -> user approval -> merge -> Production verification`

## Success criteria
TG LABS has a tested reusable responsive visual foundation capable of supporting the approved Homepage, Patient, Admin and Technician designs without changing current business logic or security boundaries, isolated in an unmerged PR and exact-head validated before any merge decision.