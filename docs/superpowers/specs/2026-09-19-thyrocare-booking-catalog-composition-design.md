# Thyrocare Booking, Catalog Composition and Patient Detail Design

Date: 2026-09-19
Baseline: main @ 959cb80c34bcfdf22cb942b950b01ad54521daac
Status: Design only — no Production activation or catalog writes

## Intent

Make the imported Thyrocare catalog patient-usable while preserving TG Labs booking-integrity safeguards. Patients should be able to discover Thyrocare tests, profiles and packages, see useful details/images, understand included tests, and avoid paying separately for tests already included in a selected profile/package.

## Scope

- Support the existing Thyrocare catalog (expected 987 tests and 376 packages/profiles) in patient discovery and eventual booking.
- Preserve partner/offer activation, operational readiness, pincode/serviceability and checkout eligibility checks.
- Expose an optional patient-facing details image using the existing imageData fields.
- Maintain package/profile composition so patients can view included tests.
- Prevent redundant cart/checkout purchases when a selected individual test is already contained in a selected profile/package.
- Extend the admin catalog editor for image and composition maintenance.

## Non-goals

- Do not invent medical preparation/sample instructions.
- Do not bulk-enable Production booking before operational/serviceability prerequisites are verified.
- Do not change prices, TAT, accreditation, pincode coverage or medical metadata as a side effect.
- Do not copy third-party copyrighted artwork into TG Labs without authorization.
- Do not merge/deploy during implementation without the existing Preview and explicit approval gates.

## Existing foundations

The current Prisma schema already has DiagnosticTest.imageData and DiagnosticPackage.imageData. PackageItem represents Package -> Test membership. DiagnosticPackage.packageType distinguishes PACKAGE and PROFILE. Partner offers and DiagnosticPartner contain availability, bookingEnabled, operationalEnabled and serviceability-related controls.

## Architecture

### 1. Catalog composition

PackageItem remains the canonical atomic membership relation: every PROFILE or PACKAGE resolves to its underlying DiagnosticTest records. This provides one consistent set of test IDs for display and duplicate detection.

For package-to-profile presentation, add an explicit package/profile composition relation only if repository/schema investigation during planning confirms that nested display cannot be represented safely from existing data. The booking engine must always flatten nested membership to unique test IDs before overlap checks.

No composition membership may be inferred solely from a package name. It must come from imported/admin-maintained catalog data.

### 2. Patient detail experience

Test/profile/package detail responses expose:
- existing description, preparation, sample, TAT and price fields where present;
- optional imageData;
- packageType;
- included test count and included test summaries for profiles/packages.

The patient UI shows a View test details/image action only when imageData exists. Profiles/packages show Includes N tests and an expandable/view-all list.

### 3. Duplicate-purchase protection

Introduce a shared containment resolver that returns the unique underlying test IDs for each cart item.

Client behavior:
- Adding an individual test already covered by a selected profile/package shows that it is already included and does not add a redundant paid line.
- Adding a profile/package that covers individually selected tests identifies those overlaps and allows/removes redundant individual lines according to the final UI implementation.
- Multiple packages may coexist; overlapping underlying tests are disclosed, but packages are not silently removed because package pricing/value may differ.

Server behavior:
- Booking/checkout re-resolves containment from authoritative database state.
- It rejects redundant individual tests already covered by a selected package/profile even if the browser state is manipulated.
- Existing partner eligibility, offer availability, pincode/serviceability, booking and payment checks remain authoritative.

### 4. Thyrocare bookability

Separate discoverability from booking eligibility. Thyrocare catalog records can be displayed without weakening operational controls.

Before any Production activation, verify:
- DiagnosticPartner active/display/booking/operational flags;
- each offer's active/availability state;
- serviceable pincodes/home collection state;
- order-handoff and report-intake readiness;
- checkout revalidation behavior.

Only records that pass the existing eligibility chain may expose a working booking action. Bulk Production activation is a separately verified data operation after Preview code validation and explicit approval.

### 5. Admin maintenance

Extend the guarded admin catalog editor so an authorized admin can:
- maintain imageData;
- add/remove underlying tests for a PROFILE/PACKAGE;
- view composition before saving;
- preserve existing audit logging and safety guards.

Composition writes must be transactional and exact-ID based. Price/TAT/activation/availability fields must not change as a side effect.

### 6. Data migration/import

First run a read-only Thyrocare audit to measure existing PackageItem coverage and identify whether component source data already exists. Do not manufacture membership from names.

If a schema migration is required for nested package/profile display, it will be additive and isolated, with staging/Preview validation before any Production migration. Prefer no schema change if existing PackageItem + packageType can satisfy the required behavior.

### 7. Testing

TDD regression coverage must include:
- image detail visibility only when imageData exists;
- profile/package included-test API/UI;
- individual-test duplicate prevention;
- reverse overlap when adding a profile/package after individual tests;
- server-side checkout rejection of redundant individual tests;
- overlapping package behavior;
- partner/offer/serviceability safeguards remain enforced;
- no regression to existing Sagepath/TG Labs catalog behavior;
- admin authorization and composition-write guards.

## Release sequence

1. Read-only repo/database baseline and Thyrocare composition/eligibility audit.
2. Write implementation plan and tests.
3. Feature branch; TDD RED then GREEN.
4. Unmerged PR.
5. Exact-head Vercel Preview.
6. Validate patient catalog/detail/cart/checkout/admin flows.
7. User merge approval.
8. Merge with exact-head protection.
9. Wait for exact Production deployment READY.
10. Read-only Production verification.
11. Separately preflight and explicitly approve any Thyrocare Production activation/data writes.

## Success criteria

Patients can discover Thyrocare catalog entries, view available details/images and package/profile contents, and cannot be charged separately for an individual test already covered by a selected profile/package. Thyrocare booking becomes available only where the existing operational and serviceability safeguards confirm eligibility. Admins can maintain composition and images without unintentionally changing commercial or operational fields.
