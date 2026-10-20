import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVerifiedManualUpiAmounts, type VerifiedManualUpiAmounts } from '../lib/manual-upi-verified-amounts';

const valid: VerifiedManualUpiAmounts = {
  bookingId: 'booking-test', originalGrossPaise: 528000,
  verifiedPaidPaise: 250000, approvedDiscountPaise: 0, outstandingPaise: 278000,
  bankSettlementConfirmed: true, discountExplicitlyAuthorized: false,
  personalAccountCollectionAuthorized: true, collectionAccountType: 'PERSONAL',
  bankEvidenceDigest: 'independent-bank-digest',
  requestedByUid: 'requester', verifiedByUid: 'verifier', authorizedByUid: 'approver',
};

test('accepts verified payment with unresolved outstanding balance, without inventing a discount', () => {
  assert.equal(validateVerifiedManualUpiAmounts(valid).eligible, true);
});
test('rejects unsupported discount', () => {
  const result = validateVerifiedManualUpiAmounts({
    ...valid, approvedDiscountPaise: 278000, outstandingPaise: 0,
  });
  assert.ok(result.blockers.includes('DISCOUNT_NOT_AUTHORIZED'));
});
test('rejects unconfirmed settlement', () => {
  assert.ok(validateVerifiedManualUpiAmounts({...valid, bankSettlementConfirmed: false})
    .blockers.includes('BANK_SETTLEMENT_NOT_CONFIRMED'));
});
test('rejects self-verification', () => {
  assert.ok(validateVerifiedManualUpiAmounts({...valid, verifiedByUid: 'requester'})
    .blockers.includes('INDEPENDENT_STAFF_REQUIRED'));
});
test('rejects unapproved personal account collection', () => {
  assert.ok(validateVerifiedManualUpiAmounts({...valid, personalAccountCollectionAuthorized: false})
    .blockers.includes('PERSONAL_COLLECTION_NOT_AUTHORIZED'));
});
test('rejects inconsistent totals', () => {
  assert.ok(validateVerifiedManualUpiAmounts({...valid, outstandingPaise: 0})
    .blockers.includes('INVALID_FINANCIAL_RECONCILIATION'));
});
