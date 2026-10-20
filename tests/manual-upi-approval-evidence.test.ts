import assert from 'node:assert/strict';
import test from 'node:test';
import { validateManualUpiApprovalEvidence } from '../lib/manual-upi-approval-evidence';

const valid = {
  requestedByUid: 'requester-1', approvedByUid: 'approver-2', verifiedByUid: 'verifier-3',
  paymentReferenceHash: 'sha256-placeholder', bankCreditEvidenceReference: 'secure-evidence-id',
  originalReceiptEvidenceReference: 'original-receipt-id',
  reason: 'Correct receipt to verified direct UPI collection',
  approvalRecordedAt: '2026-10-09T10:00:00.000Z',
};
test('accepts complete independent reviewer metadata', () => {
  assert.equal(validateManualUpiApprovalEvidence(valid).eligibleForIndependentReview, true);
});
test('blocks requester self-approval and verifier self-approval', () => {
  assert.ok(validateManualUpiApprovalEvidence({ ...valid, approvedByUid: valid.requestedByUid }).blockers.includes('REQUESTER_CANNOT_APPROVE'));
  assert.ok(validateManualUpiApprovalEvidence({ ...valid, approvedByUid: valid.verifiedByUid }).blockers.includes('PAYMENT_VERIFIER_CANNOT_APPROVE'));
});
test('blocks missing evidence and invalid approval time', () => {
  const result = validateManualUpiApprovalEvidence({ ...valid, bankCreditEvidenceReference: '', approvalRecordedAt: 'invalid' });
  assert.ok(result.blockers.includes('MISSING_APPROVAL_EVIDENCE'));
  assert.ok(result.blockers.includes('INVALID_APPROVAL_TIMESTAMP'));
});

test('blocks requester from independently verifying their own payment', () => {
  const result = validateManualUpiApprovalEvidence({ ...valid, verifiedByUid: valid.requestedByUid });
  assert.equal(result.eligibleForIndependentReview, false);
  assert.ok(result.blockers.includes('REQUESTER_CANNOT_VERIFY_PAYMENT'));
});

test('blocks an approval when requester and verifier identities match', () => {
  const result = validateManualUpiApprovalEvidence({ ...valid, requestedByUid: 'same-uid', verifiedByUid: 'same-uid' });
  assert.ok(result.blockers.includes('REQUESTER_CANNOT_VERIFY_PAYMENT'));
});
