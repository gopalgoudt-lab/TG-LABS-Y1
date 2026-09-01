import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  assertCommerciallyEligible,
  commercialIneligibilityReasons,
  isCommerciallyEligible,
  type CommercialEligibilityInput,
} from '../lib/catalog-eligibility';
import { isHomeCollectionServiceable, isValidIndianPincode } from '../lib/serviceability';

const now = new Date('2026-08-29T00:00:00.000Z');
const eligible: CommercialEligibilityInput = {
  product: { active: true },
  partner: { id: 'partner-approved', active: true, bookingEnabled: true, operationalEnabled: true },
  offer: {
    active: true,
    availability: 'AVAILABLE',
    price: 300,
    mrp: 500,
    tat: '24 hrs',
    sourceReference: 'owner-approved-source',
    lastVerifiedAt: new Date('2026-08-28T00:00:00.000Z'),
    effectiveFrom: new Date('2026-08-01T00:00:00.000Z'),
    effectiveTo: new Date('2026-09-30T00:00:00.000Z'),
  },
  collection: {
    mode: 'HOME',
    pincode: '500001',
    serviceability: [{ partnerId: 'partner-approved', pincode: '500001', active: true, homeCollectionEnabled: true }],
  },
  now,
};

test('complete verified operational offer is eligible only in an enabled pincode', () => {
  assert.equal(isCommerciallyEligible(eligible), true);
  assert.doesNotThrow(() => assertCommerciallyEligible(eligible));
  assert.equal(
    isCommerciallyEligible({
      ...eligible,
      collection: {
        mode: 'HOME',
        pincode: '500002',
        serviceability: eligible.collection.mode === 'HOME' ? eligible.collection.serviceability : [],
      },
    }),
    false,
  );
});

test('partner display does not imply booking or operational eligibility', () => {
  const reasons = commercialIneligibilityReasons({
    ...eligible,
    partner: { ...eligible.partner, bookingEnabled: false, operationalEnabled: false },
  });
  assert.deepEqual(reasons, ['PARTNER_BOOKING_DISABLED', 'PARTNER_OPERATIONAL_DISABLED']);
});

test('offer fails closed when commercial verification fields are incomplete', () => {
  const reasons = commercialIneligibilityReasons({
    ...eligible,
    offer: { ...eligible.offer, tat: null, sourceReference: null, lastVerifiedAt: null },
  });
  assert.deepEqual(reasons, ['OFFER_TAT_MISSING', 'OFFER_SOURCE_MISSING', 'OFFER_VERIFICATION_MISSING']);
});

test('invalid price, MRP and effective windows block eligibility', () => {
  assert.deepEqual(
    commercialIneligibilityReasons({ ...eligible, offer: { ...eligible.offer, price: 0 } }),
    ['OFFER_PRICE_INVALID'],
  );
  assert.deepEqual(
    commercialIneligibilityReasons({ ...eligible, offer: { ...eligible.offer, price: 600, mrp: 500 } }),
    ['OFFER_PRICE_EXCEEDS_MRP'],
  );
  assert.deepEqual(
    commercialIneligibilityReasons({ ...eligible, offer: { ...eligible.offer, effectiveFrom: new Date('2026-08-30') } }),
    ['OFFER_NOT_YET_EFFECTIVE'],
  );
  assert.deepEqual(
    commercialIneligibilityReasons({ ...eligible, offer: { ...eligible.offer, effectiveTo: new Date('2026-08-28') } }),
    ['OFFER_EXPIRED'],
  );
});

test('pincode serviceability is exact and fail closed', () => {
  assert.equal(isValidIndianPincode('500001'), true);
  assert.equal(isValidIndianPincode('050001'), false);
  assert.equal(isHomeCollectionServiceable('partner-approved', '500001', []), false);
  assert.equal(
    isHomeCollectionServiceable('partner-approved', '500001', [
      { partnerId: 'partner-approved', pincode: '500001', active: true, homeCollectionEnabled: false },
    ]),
    false,
  );
});

test('centre collection requires separate explicit configuration', () => {
  assert.deepEqual(
    commercialIneligibilityReasons({ ...eligible, collection: { mode: 'CENTRE', centreCollectionConfigured: false } }),
    ['CENTRE_COLLECTION_NOT_CONFIGURED'],
  );
  assert.equal(
    isCommerciallyEligible({ ...eligible, collection: { mode: 'CENTRE', centreCollectionConfigured: true } }),
    true,
  );
});

test('migration is additive and operational defaults remain disabled', () => {
  const migration = readFileSync(
    new URL('../prisma/migrations/20260829150000_phase2c_catalog_foundation/migration.sql', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(migration, /^\s*(DROP|TRUNCATE|DELETE|UPDATE)\b|^\s*ALTER\b[^;]*\bRENAME\b/im);
  assert.match(migration, /"displayEnabled" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /"bookingEnabled" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /"operationalEnabled" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /"PackagePartnerOffer"[\s\S]*"active" BOOLEAN NOT NULL DEFAULT false/);
  assert.doesNotMatch(migration, /\bINSERT\b/i);
});
