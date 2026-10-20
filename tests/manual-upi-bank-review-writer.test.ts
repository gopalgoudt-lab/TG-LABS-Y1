import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assessIndependentBankReviewActors, recordIndependentBankReview } from '../lib/manual-upi-bank-review-writer';

test('three distinct valid actors satisfy identity separation', () => {
  assert.deepEqual(assessIndependentBankReviewActors('requester', 'accounts-staff', 'owner'), {
    eligible: true, blockers: [],
  });
});
test('requester cannot verify own credit', () => {
  assert.equal(assessIndependentBankReviewActors('same', 'same', 'owner').eligible, false);
});
test('approver cannot be verifier', () => {
  assert.equal(assessIndependentBankReviewActors('requester', 'same', 'same').eligible, false);
});
test('blank and whitespace-padded identities fail closed', () => {
  assert.equal(assessIndependentBankReviewActors('', 'staff', 'owner').eligible, false);
  assert.equal(assessIndependentBankReviewActors(' requester', 'staff', 'owner').eligible, false);
});
test('bank review writer always refuses persistence without security review', async () => {
  await assert.rejects(
    recordIndependentBankReview({} as never, {
      bookingId: 'synthetic', authenticatedVerifierUid: 'staff',
      requesterUid: 'requester', approverUid: 'owner',
      originalReceiptHash: 'hash', paymentReferenceHmac: 'reference',
      verifiedAmountPaise: 250000, privateEvidenceObjectKey: 'test',
    }),
    /BANK_REVIEW_PERSISTENCE_DISABLED_PENDING_SECURITY_REVIEW/,
  );
});
