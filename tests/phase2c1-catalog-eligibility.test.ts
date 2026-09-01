import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  evaluatePackageOfferEligibility,
  evaluateTestOfferEligibility,
  type CatalogOfferEligibilityInput,
  type CatalogPartnerEligibilityInput,
} from '../lib/catalog-eligibility';
import { evaluateHomeCollectionServiceability } from '../lib/serviceability';

const now = new Date('2026-08-29T12:00:00.000Z');
const product = { active: true };
const partner: CatalogPartnerEligibilityInput = {
  active: true,
  bookingEnabled: true,
  operationalEnabled: true,
  displayEnabled: false,
};
const offer: CatalogOfferEligibilityInput = {
  active: true,
  availability: 'AVAILABLE',
  price: 300,
  tat: '24 hours',
  sourceReference: 'owner-approved-price-list',
  lastVerifiedAt: new Date('2026-08-28T12:00:00.000Z'),
  effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
  effectiveTo: new Date('2026-09-30T23:59:59.999Z'),
};

function reasons(
  offerOverrides: Partial<CatalogOfferEligibilityInput> = {},
  partnerOverrides: Partial<CatalogPartnerEligibilityInput> = {},
  active = true,
) {
  return evaluateTestOfferEligibility(
    { active },
    { ...offer, ...offerOverrides },
    { ...partner, ...partnerOverrides },
    now,
  ).reasons;
}

test('additive schema keeps legacy records compatible through nullable fields and defaults', () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  assert.match(schema, /catalogCode\s+String\?\s+@unique/);
  assert.match(schema, /packageType\s+DiagnosticPackageType\?/);
  assert.match(schema, /aliases\s+String\[\]\s+@default\(\[\]\)/);
  assert.match(schema, /offerId\s+String\?/);
  assert.match(schema, /partnerAvailability\s+PartnerOfferAvailability\?/);
});

test('partner operational defaults are fail-closed in schema and migration', () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
  const migration = readFileSync(
    new URL('../prisma/migrations/20260829153000_phase2c1_catalog_eligibility_foundation/migration.sql', import.meta.url),
    'utf8',
  );
  for (const field of ['bookingEnabled', 'operationalEnabled', 'displayEnabled']) {
    assert.match(schema, new RegExp(`${field}\\s+Boolean\\s+@default\\(false\\)`));
    assert.match(migration, new RegExp(`"${field}" BOOLEAN NOT NULL DEFAULT false`));
  }
});

test('displayEnabled alone never permits booking', () => {
  const result = evaluateTestOfferEligibility(product, offer, {
    active: true,
    bookingEnabled: false,
    operationalEnabled: false,
    displayEnabled: true,
  }, now);
  assert.equal(result.bookable, false);
  assert.deepEqual(result.reasons, ['PARTNER_BOOKING_DISABLED', 'PARTNER_OPERATIONAL_DISABLED']);
});

test('inactive product is rejected', () => assert.ok(reasons({}, {}, false).includes('PRODUCT_INACTIVE')));
test('inactive offer is rejected', () => assert.ok(reasons({ active: false }).includes('OFFER_INACTIVE')));
test('UNAVAILABLE offer is rejected', () => assert.ok(reasons({ availability: 'UNAVAILABLE' }).includes('OFFER_NOT_AVAILABLE')));
test('CHECK_AVAILABILITY offer is rejected from direct booking', () => assert.ok(reasons({ availability: 'CHECK_AVAILABILITY' }).includes('OFFER_NOT_AVAILABLE')));
test('zero price is rejected', () => assert.ok(reasons({ price: 0 }).includes('INVALID_PRICE')));
test('negative price is rejected', () => assert.ok(reasons({ price: -1 }).includes('INVALID_PRICE')));
test('missing TAT is rejected', () => assert.ok(reasons({ tat: '   ' }).includes('MISSING_TAT')));
test('missing sourceReference is rejected', () => assert.ok(reasons({ sourceReference: null }).includes('MISSING_SOURCE_REFERENCE')));
test('missing lastVerifiedAt is rejected', () => assert.ok(reasons({ lastVerifiedAt: null }).includes('MISSING_LAST_VERIFIED_AT')));
test('inactive partner is rejected', () => assert.ok(reasons({}, { active: false }).includes('PARTNER_INACTIVE')));
test('booking-disabled partner is rejected', () => assert.ok(reasons({}, { bookingEnabled: false }).includes('PARTNER_BOOKING_DISABLED')));
test('operational-disabled partner is rejected', () => assert.ok(reasons({}, { operationalEnabled: false }).includes('PARTNER_OPERATIONAL_DISABLED')));
test('not-yet-effective offer is rejected', () => assert.ok(reasons({ effectiveFrom: new Date('2026-08-30T00:00:00.000Z') }).includes('OFFER_NOT_YET_EFFECTIVE')));
test('expired offer is rejected', () => assert.ok(reasons({ effectiveTo: new Date('2026-08-28T23:59:59.999Z') }).includes('OFFER_EXPIRED')));

test('valid test offer is accepted by pure eligibility logic', () => {
  assert.deepEqual(evaluateTestOfferEligibility(product, offer, partner, now), { bookable: true, reasons: [] });
});

test('malformed pincode is rejected', () => {
  const result = evaluateHomeCollectionServiceability('012345', { pincode: '012345', active: true, homeCollectionEnabled: true });
  assert.ok(result.reasons.includes('INVALID_PINCODE'));
});

test('missing serviceability is rejected', () => {
  assert.deepEqual(evaluateHomeCollectionServiceability('500001', null), {
    serviceable: false,
    reasons: ['SERVICEABILITY_NOT_CONFIGURED'],
  });
});

test('inactive serviceability is rejected', () => {
  const result = evaluateHomeCollectionServiceability('500001', { pincode: '500001', active: false, homeCollectionEnabled: true });
  assert.ok(result.reasons.includes('SERVICEABILITY_INACTIVE'));
});

test('homeCollectionEnabled=false is rejected for home collection', () => {
  const result = evaluateHomeCollectionServiceability('500001', { pincode: '500001', active: true, homeCollectionEnabled: false });
  assert.ok(result.reasons.includes('HOME_COLLECTION_DISABLED'));
});

test('valid serviceability is accepted', () => {
  assert.deepEqual(
    evaluateHomeCollectionServiceability('500001', { pincode: '500001', active: true, homeCollectionEnabled: true }),
    { serviceable: true, reasons: [] },
  );
});

test('PackagePartnerOffer follows equivalent fail-closed rules', () => {
  assert.equal(evaluatePackageOfferEligibility(product, { ...offer, sourceReference: null }, partner, now).bookable, false);
  assert.deepEqual(evaluatePackageOfferEligibility(product, offer, partner, now), { bookable: true, reasons: [] });
});
