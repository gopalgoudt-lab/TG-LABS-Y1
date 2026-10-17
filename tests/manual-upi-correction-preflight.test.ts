import assert from 'node:assert/strict';
import test from 'node:test';
import { assessManualUpiCorrectionPreflight } from '../lib/manual-upi-correction-preflight';

const input = {
  amounts: { originalGrossAmount: 5280, discountAmount: 2780, correctedNetAmount: 2500, verifiedPaidAmount: 2500 },
  originalReceiptId: 'original-receipt',
  phonePeEvidenceVerified: true,
  bankCreditVerified: true,
  discountApproved: true,
  existingPaymentRecordsReviewed: true,
  originalReceiptPreserved: true,
};

test('requires all independent verification gates', () => {
  assert.deepEqual(assessManualUpiCorrectionPreflight(input), { eligibleForFurtherReview: true, blockers: [] });
  for (const field of ['phonePeEvidenceVerified', 'bankCreditVerified', 'discountApproved', 'existingPaymentRecordsReviewed', 'originalReceiptPreserved'] as const) {
    const result = assessManualUpiCorrectionPreflight({ ...input, [field]: false });
    assert.equal(result.eligibleForFurtherReview, false);
    assert.equal(result.blockers.length, 1);
  }
});

test('rejects mismatched paid amount and missing original receipt', () => {
  const result = assessManualUpiCorrectionPreflight({
    ...input,
    amounts: { ...input.amounts, verifiedPaidAmount: 5280 },
    originalReceiptId: ' ',
  });
  assert.equal(result.eligibleForFurtherReview, false);
  assert.ok(result.blockers.includes('INVALID_AMOUNTS'));
  assert.ok(result.blockers.includes('ORIGINAL_RECEIPT_REQUIRED'));
});
