import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateManualUpiBalance } from '../lib/manual-upi-balance';

const base = { originalGrossPaise: 528000, verifiedPaidPaise: 250000, approvedDiscountPaise: 0, discountAuthorized: false };

test('partial payment preserves outstanding without an inferred discount', () => {
  assert.deepEqual(calculateManualUpiBalance(base), {
    originalGrossPaise: 528000, verifiedPaidPaise: 250000,
    approvedDiscountPaise: 0, outstandingPaise: 278000, settlement: 'PARTIAL',
  });
});

test('fully approved discount settles only when explicitly authorized', () => {
  const result = calculateManualUpiBalance({ ...base, approvedDiscountPaise: 278000, discountAuthorized: true });
  assert.equal(result.outstandingPaise, 0);
  assert.equal(result.settlement, 'SETTLED');
});

test('partially approved discount leaves the remaining balance', () => {
  const result = calculateManualUpiBalance({ ...base, approvedDiscountPaise: 100000, discountAuthorized: true });
  assert.equal(result.outstandingPaise, 178000);
  assert.equal(result.settlement, 'PARTIAL');
});

test('rejects unapproved discounts', () => {
  assert.throws(() => calculateManualUpiBalance({ ...base, approvedDiscountPaise: 278000 }), /DISCOUNT_NOT_AUTHORIZED/);
});

test('rejects overpayments and excessive discounts', () => {
  assert.throws(() => calculateManualUpiBalance({ ...base, verifiedPaidPaise: 528001 }), /PAYMENT_EXCEEDS_BOOKING/);
  assert.throws(() => calculateManualUpiBalance({ ...base, approvedDiscountPaise: 278001, discountAuthorized: true }), /PAYMENT_EXCEEDS_BOOKING/);
});

test('rejects negative, fractional and unsafe amounts', () => {
  for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
    assert.throws(() => calculateManualUpiBalance({ ...base, verifiedPaidPaise: value }), /INVALID_FINANCIAL_AMOUNT/);
  }
  assert.throws(() => calculateManualUpiBalance({ ...base, originalGrossPaise: 0 }), /INVALID_FINANCIAL_AMOUNT/);
});

test('settles fully verified payment without a discount', () => {
  const result = calculateManualUpiBalance({ ...base, verifiedPaidPaise: 528000 });
  assert.equal(result.settlement, 'SETTLED');
  assert.equal(result.outstandingPaise, 0);
});
