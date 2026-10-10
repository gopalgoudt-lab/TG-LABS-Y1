import { validateManualUpiApprovalEvidence, type ManualUpiApprovalEvidence } from './manual-upi-approval-evidence';

export type TrustedApprovalGateInput = {
  evidence: ManualUpiApprovalEvidence;
  authenticatedReviewerUid: string;
  reviewerAuthorized: boolean;
  bankCreditConfirmedFromTrustedSource: boolean;
  phonePeReferenceConfirmedFromTrustedSource: boolean;
  discountAuthorizedFromTrustedSource: boolean;
  receiptHashMatchesFrozenSnapshot: boolean;
  existingPaymentRecordsReviewed: boolean;
};

/** Pure, fail-closed gate. The caller MUST obtain each attestation from a trusted
 * server-side source, never from request JSON. Does not persist or issue approval. */
export function assessTrustedManualUpiApproval(input: TrustedApprovalGateInput) {
  const blockers = [...validateManualUpiApprovalEvidence(input.evidence).blockers];
  if (!input.authenticatedReviewerUid || input.authenticatedReviewerUid !== input.evidence.approvedByUid)
    blockers.push('APPROVER_IDENTITY_MISMATCH');
  if (!input.reviewerAuthorized) blockers.push('REVIEWER_NOT_AUTHORIZED');
  if (!input.bankCreditConfirmedFromTrustedSource) blockers.push('BANK_CREDIT_NOT_VERIFIED');
  if (!input.phonePeReferenceConfirmedFromTrustedSource) blockers.push('PHONEPE_REFERENCE_NOT_VERIFIED');
  if (!input.discountAuthorizedFromTrustedSource) blockers.push('DISCOUNT_NOT_AUTHORIZED');
  if (!input.receiptHashMatchesFrozenSnapshot) blockers.push('FROZEN_RECEIPT_MISMATCH');
  if (!input.existingPaymentRecordsReviewed) blockers.push('PAYMENT_RECORDS_NOT_REVIEWED');
  return { eligibleForTrustedApprovalIssuance: blockers.length === 0, blockers };
}
