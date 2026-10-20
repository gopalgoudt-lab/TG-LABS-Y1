import assert from 'node:assert/strict';
import test from 'node:test';
import { assessTrustedManualUpiApproval, type TrustedApprovalGateInput } from '../lib/manual-upi-trusted-approval-gate';

/** Regression tests: caller-supplied assertions must not substitute for verified bank evidence. */
const valid: TrustedApprovalGateInput = {
  evidence: {
    requestedByUid: 'requester', verifiedByUid: 'verifier', approvedByUid: 'approver',
    paymentReferenceHash: 'trusted-phonepe-reference-hash',
    bankCreditEvidenceReference: 'trusted-bank-credit-reference',
    originalReceiptEvidenceReference: 'frozen-receipt-hash',
    reason: 'Confirmed correction', approvalRecordedAt: '2026-10-10T10:00:00Z',
  },
  authenticatedReviewerUid: 'approver', reviewerAuthorized: true,
  bankCreditConfirmedFromTrustedSource: true,
  phonePeReferenceConfirmedFromTrustedSource: true,
  discountAuthorizedFromTrustedSource: true,
  receiptHashMatchesFrozenSnapshot: true,
  existingPaymentRecordsReviewed: true,
};

test('fails closed when independent approver identity is absent', () => {
  const result = assessTrustedManualUpiApproval({ ...valid, authenticatedReviewerUid: '' });
  assert.equal(result.eligibleForTrustedApprovalIssuance, false);
  assert.ok(result.blockers.includes('APPROVER_IDENTITY_MISMATCH'));
});

test('rejects all same-person requester, verifier and approver combinations', () => {
  for (const [field, value, blocker] of [
    ['requestedByUid', 'approver', 'REQUESTER_CANNOT_APPROVE'],
    ['verifiedByUid', 'approver', 'PAYMENT_VERIFIER_CANNOT_APPROVE'],
    ['verifiedByUid', 'requester', 'REQUESTER_CANNOT_VERIFY_PAYMENT'],
  ] as const) {
    const result = assessTrustedManualUpiApproval({
      ...valid, evidence: { ...valid.evidence, [field]: value },
    });
    assert.equal(result.eligibleForTrustedApprovalIssuance, false);
    assert.ok(result.blockers.includes(blocker));
  }
});

test('every unverified trusted-source attestation independently blocks approval', () => {
  for (const [field, blocker] of [
    ['reviewerAuthorized', 'REVIEWER_NOT_AUTHORIZED'],
    ['bankCreditConfirmedFromTrustedSource', 'BANK_CREDIT_NOT_VERIFIED'],
    ['phonePeReferenceConfirmedFromTrustedSource', 'PHONEPE_REFERENCE_NOT_VERIFIED'],
    ['discountAuthorizedFromTrustedSource', 'DISCOUNT_NOT_AUTHORIZED'],
    ['receiptHashMatchesFrozenSnapshot', 'FROZEN_RECEIPT_MISMATCH'],
    ['existingPaymentRecordsReviewed', 'PAYMENT_RECORDS_NOT_REVIEWED'],
  ] as const) {
    const result = assessTrustedManualUpiApproval({ ...valid, [field]: false });
    assert.equal(result.eligibleForTrustedApprovalIssuance, false, field);
    assert.ok(result.blockers.includes(blocker), field);
  }
});

test('missing bank evidence or PhonePe reference rejects approval', () => {
  for (const field of ['paymentReferenceHash', 'bankCreditEvidenceReference'] as const) {
    const result = assessTrustedManualUpiApproval({
      ...valid, evidence: { ...valid.evidence, [field]: '' },
    });
    assert.equal(result.eligibleForTrustedApprovalIssuance, false);
    assert.ok(result.blockers.includes('MISSING_APPROVAL_EVIDENCE'));
  }
});
