# Phase 2C-1 — Catalog Eligibility Foundation

This phase adds schema and pure eligibility foundations only. It does not import commercial data, populate categories, create package offers or serviceability rows, or enable any partner.

## Additive schema

- Tests and packages gain nullable commercial metadata and empty-array defaults while retaining every legacy field.
- `DiagnosticPackage.packageType` is nullable so existing package/profile rows require no destructive backfill.
- Categories use `CatalogCategory` plus explicit test/package join tables.
- Partners gain separate display, booking and operational controls. All three default to `false`.
- Test offers gain commercial verification and effective-date metadata.
- `PackagePartnerOffer` provides the structured package equivalent.
- `PartnerServiceability` supports exact pincode configuration without geographic inference.
- `BookingPackage` gains nullable offer and partner snapshots. Its offer foreign key uses `ON DELETE SET NULL`, while snapshot values remain independent.

## Fail-closed behavior

`lib/catalog-eligibility.ts` requires an active product, active AVAILABLE offer, positive integer price, non-empty TAT and source reference, valid verification date, active/booking-enabled/operational partner, and a valid effective window. `displayEnabled` is deliberately ignored for booking permission.

`lib/serviceability.ts` separately requires an exact valid six-digit Indian pincode and an active matching serviceability row with home collection enabled. A missing row is not serviceable.

These helpers are not wired into public booking routes in this foundation PR; that integration belongs to Phase 2C-4. Existing Phase 2B booking and payment behavior is unchanged.

## Migration safety and compatibility

The single migration contains only additive enum, column, table, index and foreign-key operations. It performs no data update, activation, deletion, rename or destructive conversion. Existing tests, packages, partners, offers, bookings, snapshots, payments and webhook records remain readable. Legacy offers do not acquire `sourceReference` or `lastVerifiedAt`, and partner operational flags default to false, so no existing row becomes commercially verified or operational.

## Deferred phases

- Phase 2C-2: admin controls and controlled import.
- Phase 2C-3: public catalog, search and detail pages.
- Phase 2C-4: booking/package integration, serviceability enforcement and full runtime regression validation.
