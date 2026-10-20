import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  assessBankReviewUniqueness, classifyBankReviewUniqueConflict,
} from '../lib/manual-upi-bank-review-uniqueness';

const key = 'a'.repeat(64);
const base = {
  bookingId: 'booking-1', paymentReferenceHmac: key,
  existingBookingReview: null, existingReferenceReview: null,
};
test('new review passes preflight, not authorization to write', () => {
  assert.deepEqual(assessBankReviewUniqueness(base), {
    eligibleForTransactionalInsert: true, blockers: [],
  });
});
test('same booking cannot be reviewed twice', () => {
  const result = assessBankReviewUniqueness({
    ...base, existingBookingReview: { bookingId: 'booking-1', paymentReferenceHmac: key },
  });
  assert.ok(result.blockers.includes('BOOKING_ALREADY_HAS_BANK_REVIEW'));
});
test('same payment reference cannot be assigned to another booking', () => {
  const result = assessBankReviewUniqueness({
    ...base, existingReferenceReview: { bookingId: 'booking-2', paymentReferenceHmac: key },
  });
  assert.ok(result.blockers.includes('PAYMENT_REFERENCE_ALREADY_ASSIGNED'));
});
test('invalid keys fail closed', () => {
  assert.equal(assessBankReviewUniqueness({ ...base, paymentReferenceHmac: '' }).eligibleForTransactionalInsert, false);
});
test('Prisma unique constraint violation is classified without leaking details', () => {
  assert.equal(classifyBankReviewUniqueConflict({ code: 'P2002' }), 'DUPLICATE_REVIEW');
  assert.equal(classifyBankReviewUniqueConflict({ code: 'P2025' }), 'UNEXPECTED_ERROR');
});
