export type ManualUpiApprovalEvidence = {
  requestedByUid: string;
  approvedByUid: string;
  verifiedByUid: string;
  paymentReferenceHash: string;
  bankCreditEvidenceReference: string;
  originalReceiptEvidenceReference: string;
  reason: string;
  approvalRecordedAt: string;
};

/** Pure separation-of-duties validation. Identity and evidence authenticity must be checked server-side. */
export function validateManualUpiApprovalEvidence(input: ManualUpiApprovalEvidence) {
  const blockers: string[] = [];
  const fields = [
    input.requestedByUid, input.approvedByUid, input.verifiedByUid,
    input.paymentReferenceHash, input.bankCreditEvidenceReference,
    input.originalReceiptEvidenceReference, input.reason, input.approvalRecordedAt,
  ];
  if (fields.some(value => typeof value !== 'string' || !value.trim())) blockers.push('MISSING_APPROVAL_EVIDENCE');
  if (input.requestedByUid && input.approvedByUid && input.requestedByUid === input.approvedByUid)
    blockers.push('REQUESTER_CANNOT_APPROVE');
  if (input.verifiedByUid && input.approvedByUid && input.verifiedByUid === input.approvedByUid)
    blockers.push('PAYMENT_VERIFIER_CANNOT_APPROVE');
  if (!Number.isFinite(Date.parse(input.approvalRecordedAt))) blockers.push('INVALID_APPROVAL_TIMESTAMP');
  return { eligibleForIndependentReview: blockers.length === 0, blockers };
}
