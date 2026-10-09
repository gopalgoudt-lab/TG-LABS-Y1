import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCorrectedManualUpiReceipt } from '../lib/corrected-manual-upi-receipt';

const amounts = { originalGrossAmount: 5280, discountAmount: 2780, correctedNetAmount: 2500, verifiedPaidAmount: 2500 };

test('retains gross price and shows discount, PhonePe payment, and zero due', () => {
  const receipt = buildCorrectedManualUpiReceipt(amounts, 'receipt-original-001');
  assert.deepEqual(
    [receipt.grossAmount, receipt.discountAmount, receipt.totalAmount, receipt.paidAmount, receipt.dueAmount],
    [5280, 2780, 2500, 2500, 0],
  );
  assert.equal(receipt.paymentProvider, 'PHONEPE');
  assert.equal(receipt.collectionAccountType, 'OWNER_ON_BEHALF_OF_BUSINESS');
  assert.equal(receipt.originalReceiptId, 'receipt-original-001');
  assert.equal(receipt.type, 'CORRECTED_RECEIPT');
});

test('requires original receipt reference', () => {
  assert.throws(() => buildCorrectedManualUpiReceipt(amounts, ' '), /ORIGINAL_RECEIPT_REQUIRED/);
});

test('rejects mismatched collected amount', () => {
  assert.throws(
    () => buildCorrectedManualUpiReceipt({ ...amounts, verifiedPaidAmount: 5280 }, 'receipt-original-001'),
    /INVALID_CORRECTION_AMOUNTS/,
  );
});
