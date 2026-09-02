import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProvisionalComparisonRows, normalizeProvisionalTestName, type ProvisionalComparisonCandidate } from '../lib/provisional-test-comparison';

function candidate(overrides: Partial<ProvisionalComparisonCandidate>) {
  return { offerId: 'offer', productSlug: 'product', productName: 'C-Reactive Protein (CRP)', sampleTypes: [], partnerSlug: 'sagepath-labs', partnerName: 'Sagepath Labs', price: 400, mrp: 400, ...overrides } satisfies ProvisionalComparisonCandidate;
}

test('normalization handles conservative spelling and abbreviation rules', () => {
  assert.equal(normalizeProvisionalTestName('C-Reactive Protein (CRP)'), normalizeProvisionalTestName('C REACTIVE PROTEIN'));
  assert.equal(normalizeProvisionalTestName('Glycosylated Haemoglobin - Serum'), normalizeProvisionalTestName('GLYCATED HEMOGLOBIN'));
});

test('comparison includes only exact normalized names represented by both labs', () => {
  const rows = buildProvisionalComparisonRows([candidate({ offerId: 'sage-crp' }), candidate({ offerId: 'thy-crp', productSlug: 'thy-crp', productName: 'C REACTIVE PROTEIN', partnerSlug: 'thyrocare', partnerName: 'Thyrocare', price: 525 }), candidate({ offerId: 'sage-only', productName: 'Vitamin B12' })]);
  assert.equal(rows.length, 1); assert.equal(rows[0].sagepath.offerId, 'sage-crp'); assert.equal(rows[0].thyrocare.offerId, 'thy-crp'); assert.equal(rows[0].matchBasis, 'Exact normalized name only');
});

test('comparison never performs fuzzy matching', () => {
  const rows = buildProvisionalComparisonRows([candidate({ productName: 'Herpes Simplex Virus 1 IgG' }), candidate({ partnerSlug: 'thyrocare', partnerName: 'Thyrocare', productName: 'Herpes Simplex Virus IgG' })]);
  assert.deepEqual(rows, []);
});

test('the lowest priced duplicate from each partner is selected deterministically', () => {
  const rows = buildProvisionalComparisonRows([candidate({ offerId: 'sage-high', price: 500 }), candidate({ offerId: 'sage-low', price: 400 }), candidate({ offerId: 'thy-high', partnerSlug: 'thyrocare', partnerName: 'Thyrocare', price: 600 }), candidate({ offerId: 'thy-low', partnerSlug: 'thyrocare', partnerName: 'Thyrocare', price: 525 })]);
  assert.equal(rows[0].sagepath.offerId, 'sage-low'); assert.equal(rows[0].thyrocare.offerId, 'thy-low');
});
