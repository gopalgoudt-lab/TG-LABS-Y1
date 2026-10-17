import assert from 'node:assert/strict';
import test from 'node:test';
import { assessTrustedManualUpiApproval, type TrustedApprovalGateInput } from '../lib/manual-upi-trusted-approval-gate';

const valid: TrustedApprovalGateInput = {
  evidence: {
    requestedByUid: 'requester', verifiedByUid: 'verifier', approvedByUid: 'approver',
    paymentReferenceHash: 'reference-hash', bankCreditEvidenceReference: 'bank-evidence',
    originalReceiptEvidenceReference: 'receipt-hash', reason: 'Verified correction',
    approvalRecordedAt: '2026-10-10T10:00:00.000Z',
  },
  authenticatedReviewerUid: 'approver', reviewerAuthorized: true,
  bankCreditConfirmedFromTrustedSource: true,
  phonePeReferenceConfirmedFromTrustedSource: true,
  discountAuthorizedFromTrustedSource: true,
  receiptHashMatchesFrozenSnapshot: true,
  existingPaymentRecordsReviewed: true,
};

test('accepts only fully trusted independent review inputs', () => {
  assert.equal(assessTrustedManualUpiApproval(valid).eligibleForTrustedApprovalIssuance, true);
});
test('rejects each missing trusted verification individually', () => {
  const keys = [
    'reviewerAuthorized', 'bankCreditConfirmedFromTrustedSource',
    'phonePeReferenceConfirmedFromTrustedSource', 'discountAuthorizedFromTrustedSource',
    'receiptHashMatchesFrozenSnapshot', 'existingPaymentRecordsReviewed',
  ] as const;
  for (const key of keys) {
    const result = assessTrustedManualUpiApproval({ ...valid, [key]: false });
    assert.equal(result.eligibleForTrustedApprovalIssuance, false, key);
    assert.ok(result.blockers.length > 0, key);
  }
});
test('rejects spoofed reviewer identity and self verification', () => {
  assert.ok(assessTrustedManualUpiApproval({ ...valid, authenticatedReviewerUid: 'other' }).blockers.includes('APPROVER_IDENTITY_MISMATCH'));
  assert.ok(assessTrustedManualUpiApproval({
    ...valid, evidence: { ...valid.evidence, verifiedByUid: 'requester' },
  }).blockers.includes('REQUESTER_CANNOT_VERIFY_PAYMENT'));
});
