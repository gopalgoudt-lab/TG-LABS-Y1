import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessTrustedUpiEvidence, type TrustedUpiEvidence, type TrustedUpiReview } from '../lib/manual-upi-trusted-evidence';

const review: TrustedUpiReview = {
  bookingId: 'booking-1', requesterUid: 'requester', verifierUid: 'verifier',
  approverUid: 'approver', expectedReferenceHash: 'ref-hash',
  expectedReceivingAccountHash: 'account-hash', expectedPaidPaise: 250000,
  approvedDiscountPaise: 0, originalGrossPaise: 528000,
  approvalRecordedAt: '2026-10-10T12:00:00.000Z',
};
const evidence: TrustedUpiEvidence = {
  bookingId: 'booking-1', referenceHash: 'ref-hash',
  receivingAccountHash: 'account-hash', amountPaise: 250000, currency: 'INR',
  source: 'BANK_RECONCILIATION', settlementConfirmed: true,
  verifiedAt: '2026-10-10T11:00:00.000Z', verifiedByUid: 'verifier',
};
test('accepts structurally consistent independently verified evidence (not proof of bank settlement)', () => {
  assert.deepEqual(assessTrustedUpiEvidence(evidence, review), { eligible: true, blockers: [] });
});
test('fails closed without trusted evidence', () => {
  assert.equal(assessTrustedUpiEvidence(null, review).eligible, false);
});
test('rejects same-person requester and approver', () => {
  assert.ok(assessTrustedUpiEvidence(evidence, { ...review, approverUid: 'requester' }).blockers.includes('SEPARATION_OF_DUTIES_REQUIRED'));
});
test('rejects mismatched receiving account and reference', () => {
  assert.ok(assessTrustedUpiEvidence({ ...evidence, receivingAccountHash: 'wrong', referenceHash: 'wrong' }, review).blockers.includes('EVIDENCE_BINDING_MISMATCH'));
});
test('rejects unconfirmed settlement', () => {
  assert.ok(assessTrustedUpiEvidence({ ...evidence, settlementConfirmed: false }, review).blockers.includes('SETTLEMENT_NOT_TRUSTED'));
});
test('rejects incorrect amount', () => {
  assert.ok(assessTrustedUpiEvidence({ ...evidence, amountPaise: 528000 }, review).blockers.includes('PAYMENT_AMOUNT_MISMATCH'));
});
test('rejects forged verifier identity and verification after approval', () => {
  assert.ok(assessTrustedUpiEvidence({ ...evidence, verifiedByUid: 'requester', verifiedAt: '2026-10-11T00:00:00Z' }, review).blockers.includes('INVALID_VERIFICATION_PROVENANCE'));
});
test('rejects discount exceeding gross amount', () => {
  assert.ok(assessTrustedUpiEvidence(evidence, { ...review, approvedDiscountPaise: 528001 }).blockers.includes('INVALID_FINANCIAL_AMOUNTS'));
});
