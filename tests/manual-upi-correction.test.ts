import assert from 'node:assert/strict';
import test from 'node:test';
import { validateManualUpiCorrectionAmounts } from '../lib/manual-upi-correction';

test('accepts the documented 5280 to 2500 correction', () => {
  assert.equal(validateManualUpiCorrectionAmounts({ originalGrossAmount: 5280, discountAmount: 2780, correctedNetAmount: 2500, verifiedPaidAmount: 2500 }), true);
});

test('rejects mismatch between received amount and corrected total', () => {
  assert.equal(validateManualUpiCorrectionAmounts({ originalGrossAmount: 5280, discountAmount: 2780, correctedNetAmount: 2500, verifiedPaidAmount: 5280 }), false);
});

test('rejects negative, fractional and excessive discounts', () => {
  for (const discountAmount of [-1, 2780.5, 5281]) {
    assert.equal(validateManualUpiCorrectionAmounts({ originalGrossAmount: 5280, discountAmount, correctedNetAmount: 2500, verifiedPaidAmount: 2500 }), false);
  }
});
