# Thyrocare Booking, Catalog Composition and Patient Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Thyrocare catalog safely patient-usable with details images, profile/package contents, and duplicate-purchase protection without weakening TG Labs booking safeguards.

**Architecture:** Keep `PackageItem` as the atomic Package/Profile -> DiagnosticTest membership relation and flatten all selected profiles/packages to unique test IDs for overlap detection. Extend existing catalog/admin surfaces rather than introducing a parallel catalog system. Discoverability and bookability remain separate; Production activation is a separately approved data operation after code Preview validation.

**Tech Stack:** Next.js, TypeScript, Prisma, PostgreSQL/Neon, Firebase-authenticated admin session, Node test runner, Vercel Preview/Production.

**Spec:** `docs/superpowers/specs/2026-09-19-thyrocare-booking-catalog-composition-design.md`

## Global Constraints

- Do not invent medical preparation/sample instructions.
- Do not bulk-enable Production booking before operational/serviceability prerequisites are verified.
- Do not change prices, TAT, accreditation, pincode coverage or medical metadata as a side effect.
- Do not copy third-party copyrighted artwork without authorization.
- Preserve partner/offer activation, operational readiness, pincode/serviceability and checkout eligibility checks.
- Use TDD RED -> GREEN and keep the PR unmerged through exact-head Preview validation.
- Production activation/data writes require a separate preflight and explicit approval.

## Review Focus

- A manipulated checkout payload containing an individual test already covered by a package must be rejected server-side.
- Two selected packages that overlap must not be silently deleted or repriced; overlap is disclosed while package choices remain intact.
- Missing or malformed imageData must not break patient detail rendering.
- Composition edits must not mutate price, MRP, TAT, activation or availability.
- Thyrocare items that are displayable but fail operational/serviceability eligibility must remain non-bookable.

---

### Task 1: Read-only Thyrocare baseline and composition audit

**Files:**
- Create: `tests/thyrocare-catalog-baseline.test.ts`
- Create: `docs/audits/thyrocare-catalog-baseline.md`

**Interfaces:**
- Consumes: existing Prisma models `DiagnosticPartner`, `TestPartnerOffer`, `PackagePartnerOffer`, `PackageItem`.
- Produces: verified counts/eligibility/composition baseline used by later tasks.

- [ ] Write a regression test that asserts the expected imported Thyrocare counts (987 tests, 376 packages/profiles) only against the controlled audit fixture/query output.
- [ ] Run `node --import tsx --test tests/thyrocare-catalog-baseline.test.ts` and capture RED before adding the fixture/query adapter.
- [ ] Add the minimal read-only audit adapter/query and record partner flags, offer states, serviceability count, PackageItem coverage, packageType distribution and missing metadata counts.
- [ ] Run the test again and require PASS.
- [ ] Commit only audit/test artifacts: `git commit -m "test: baseline Thyrocare catalog composition"`.

### Task 2: Shared catalog containment resolver

**Files:**
- Create: `lib/catalog/containment.ts`
- Create: `tests/catalog-containment.test.ts`

**Interfaces:**
- Produces: `resolveCoveredTestIds(items, composition): Set<string>` and `findRedundantIndividualTests(items, composition): string[]`.

- [ ] Write failing tests for individual-only carts, profile coverage, package coverage, duplicate membership, and overlapping packages.
- [ ] Run `node --import tsx --test tests/catalog-containment.test.ts`; require RED.
- [ ] Implement pure deterministic resolution using unique underlying test IDs; do not remove packages.
- [ ] Add the Review Focus case proving two overlapping packages remain selected while only redundant individual tests are identified.
- [ ] Re-run and require PASS.
- [ ] Commit: `git commit -m "feat: resolve catalog test containment"`.

### Task 3: Catalog API exposes composition and detail image

**Files:**
- Modify: existing catalog query/DTO module discovered from current `app/api/catalog` implementation.
- Modify: relevant patient catalog/detail API route.
- Create: `tests/catalog-details-composition.test.ts`

**Interfaces:**
- Produces DTO fields: `imageData: string | null`, `packageType`, `includedTestCount: number`, `includedTests: Array<{id:string;slug:string;name:string}>`.

- [ ] Write RED tests showing a package/profile returns its PackageItem tests and a test/package can return imageData.
- [ ] Add malformed/missing imageData coverage: null/empty data must serialize safely and never make the endpoint fail.
- [ ] Run the focused test and require RED.
- [ ] Extend the existing Prisma selection/DTO without changing eligibility semantics.
- [ ] Run focused and existing catalog tests; require PASS.
- [ ] Commit: `git commit -m "feat: expose catalog composition and detail images"`.

### Task 4: Patient details and included-tests UI

**Files:**
- Modify: existing test/package detail components/pages discovered on the feature branch.
- Create: focused presentation component only if existing pages would otherwise duplicate logic.
- Create: `tests/catalog-detail-ui.test.ts`

**Interfaces:**
- Consumes Task 3 DTO.
- Produces patient UI for optional image and included-test list.

- [ ] Write RED assertions for `View test details` only when imageData exists and `Includes N tests` / `View all tests` for profiles/packages.
- [ ] Run focused UI regression and require RED.
- [ ] Implement minimal accessible rendering; image absence hides the image action.
- [ ] Re-run focused tests and existing detail-page regressions; require PASS.
- [ ] Commit: `git commit -m "feat: show patient catalog details and included tests"`.

### Task 5: Client cart overlap prevention

**Files:**
- Modify: existing cart state/module and add-to-cart handlers.
- Create: `tests/cart-contained-tests.test.ts`

**Interfaces:**
- Consumes `findRedundantIndividualTests` from Task 2.
- Produces explicit overlap result used by cart UI.

- [ ] Write RED tests: adding a covered individual test is blocked; adding a package after its individual test identifies/removes only that redundant individual line; overlapping packages remain.
- [ ] Run focused test and require RED.
- [ ] Implement overlap handling through the shared resolver, preserving partner and price identity for non-redundant lines.
- [ ] Run focused + existing cart tests; require PASS.
- [ ] Commit: `git commit -m "feat: prevent redundant cart tests"`.

### Task 6: Server-side checkout/booking overlap guard

**Files:**
- Modify: existing booking/checkout revalidation module/API.
- Create: `tests/booking-contained-tests-guard.test.ts`

**Interfaces:**
- Consumes authoritative PackageItem composition and selected booking items.
- Produces a deterministic validation error for redundant individual tests.

- [ ] Write RED test that bypasses client logic and submits a package plus one of its contained individual tests.
- [ ] Add tests proving overlapping packages remain legal and existing partner/serviceability failures remain failures.
- [ ] Run focused test and require RED.
- [ ] Implement server-side authoritative containment revalidation before order/payment creation.
- [ ] Run booking/payment integrity suite plus focused test; require PASS.
- [ ] Commit: `git commit -m "feat: guard checkout against contained tests"`.

### Task 7: Guarded admin image and composition editor

**Files:**
- Modify: `app/admin/catalog-editor/page.tsx`
- Modify/Create: guarded admin catalog API routes adjacent to the existing editor routes.
- Create: `tests/admin-catalog-composition.test.ts`

**Interfaces:**
- Consumes existing `/api/admin/session` authorization boundary.
- Produces exact-ID composition mutations and imageData update.

- [ ] Write RED tests for unauthorized rejection, imageData update, add/remove PackageItem membership, and preservation of commercial/operational fields.
- [ ] Run focused test and require RED.
- [ ] Implement transactional exact-ID membership writes and image update through existing admin authorization/audit patterns.
- [ ] Add test proving price/MRP/TAT/active/availability are unchanged after composition edit.
- [ ] Run admin regression suites; require PASS.
- [ ] Commit: `git commit -m "feat: manage catalog images and composition"`.

### Task 8: Thyrocare eligibility integration without Production activation

**Files:**
- Modify only the shared patient catalog/eligibility modules identified during Task 1 if required.
- Create: `tests/thyrocare-booking-eligibility.test.ts`

**Interfaces:**
- Consumes existing partner flags, offer state and serviceability checks.
- Produces displayable/bookable status without bypasses.

- [ ] Write RED/characterization tests for displayable-but-not-bookable, inactive offer, unavailable offer, non-serviceable pincode and fully eligible offer.
- [ ] Run focused test.
- [ ] Make only the minimum integration changes needed for Thyrocare to use the existing eligibility path; never hard-code Thyrocare as bookable.
- [ ] Run catalog, cart, booking/payment and eligibility regression suites; require PASS.
- [ ] Commit: `git commit -m "feat: integrate Thyrocare booking eligibility"`.

### Task 9: Whole-branch verification and unmerged PR

**Files:** no intended product changes.

- [ ] Run all new focused tests and the existing catalog/cart/booking/admin regression suites.
- [ ] Inspect `git diff main...HEAD` for schema/migration, activation, price, pincode or unrelated changes.
- [ ] If a schema migration unexpectedly became necessary, STOP and return to a separate migration approval gate rather than bundling it silently.
- [ ] Push feature branch and open an unmerged PR.
- [ ] Record exact head SHA and changed-file list.

### Task 10: Exact-head Vercel Preview validation

- [ ] Wait for a Vercel Preview deployment whose Git SHA exactly equals the PR head.
- [ ] Validate patient discovery, details image behavior, profile/package included-test display, cart overlap behavior, manipulated checkout rejection and admin authorization.
- [ ] Confirm existing Sagepath/TG Labs behavior is unchanged.
- [ ] Do not merge; report Preview evidence and request explicit merge approval.

### Task 11: Merge and Production code verification

- [ ] Fresh-check PR state, mergeability, exact head SHA, Preview success and diff.
- [ ] Merge only with exact-head protection after explicit user approval.
- [ ] Wait for the exact resulting merge SHA's Production deployment to become READY.
- [ ] Perform read-only Production runtime verification of catalog/detail/cart/checkout/admin boundaries.
- [ ] Do not activate Thyrocare catalog offers as part of the code merge.

### Task 12: Separately controlled Thyrocare Production activation

- [ ] Fresh read-only preflight: partner flags, 987 test offers, 376 package offers, serviceability, order handoff, report intake, prices/MRP/TAT and composition coverage.
- [ ] Produce exact counts of records that satisfy all booking prerequisites and records that do not.
- [ ] Request explicit approval for the exact activation/update set.
- [ ] Apply guarded exact-state updates only to approved eligible records.
- [ ] Immediately verify counts, protected fields and patient booking behavior.
- [ ] Leave any non-eligible records discoverable but non-bookable and report why.
