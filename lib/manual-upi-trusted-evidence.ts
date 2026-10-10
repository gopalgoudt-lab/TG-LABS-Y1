/**
 * Trusted evidence boundary for manual UPI adjustments.
 * This pure validator DOES NOT verify bank settlement or issue approval.
 * Only pass evidence loaded by a trusted server-side adapter.
 */
export type TrustedUpiEvidence = Readonly<{
  bookingId: string;
  referenceHash: string;
  receivingAccountHash: string;
  amountPaise: number;
  currency: 'INR';
  source: 'BANK_RECONCILIATION' | 'VERIFIED_PROVIDER';
  settlementConfirmed: boolean;
  verifiedAt: string;
  verifiedByUid: string;
}>;

export type TrustedUpiReview = Readonly<{
  bookingId: string;
  requesterUid: string;
  verifierUid: string;
  approverUid: string;
  expectedReferenceHash: string;
  expectedReceivingAccountHash: string;
  expectedPaidPaise: number;
  approvedDiscountPaise: number;
  originalGrossPaise: number;
  approvalRecordedAt: string;
}>;

export function assessTrustedUpiEvidence(
  evidence: TrustedUpiEvidence | null,
  review: TrustedUpiReview,
): { eligible: boolean; blockers: string[] } {
  const blockers: string[] = [];
  const identities = [review.requesterUid, review.verifierUid, review.approverUid];
  if (identities.some(id => typeof id !== 'string' || !id.trim()) ||
      new Set(identities).size !== 3) blockers.push('SEPARATION_OF_DUTIES_REQUIRED');
  const amounts = [review.expectedPaidPaise, review.approvedDiscountPaise, review.originalGrossPaise];
  if (amounts.some(n => !Number.isSafeInteger(n) || n < 0) || review.originalGrossPaise <= 0 ||
      review.expectedPaidPaise + review.approvedDiscountPaise > review.originalGrossPaise)
    blockers.push('INVALID_FINANCIAL_AMOUNTS');
  if (!review.bookingId || !review.expectedReferenceHash || !review.expectedReceivingAccountHash ||
      !Number.isFinite(Date.parse(review.approvalRecordedAt))) blockers.push('INCOMPLETE_REVIEW');
  if (!evidence) return { eligible: false, blockers: [...blockers, 'TRUSTED_EVIDENCE_MISSING'] };
  if (evidence.bookingId !== review.bookingId ||
      evidence.referenceHash !== review.expectedReferenceHash ||
      evidence.receivingAccountHash !== review.expectedReceivingAccountHash)
    blockers.push('EVIDENCE_BINDING_MISMATCH');
  if (evidence.currency !== 'INR' || evidence.amountPaise !== review.expectedPaidPaise ||
      !Number.isSafeInteger(evidence.amountPaise) || evidence.amountPaise <= 0)
    blockers.push('PAYMENT_AMOUNT_MISMATCH');
  if (!evidence.settlementConfirmed ||
      !['BANK_RECONCILIATION', 'VERIFIED_PROVIDER'].includes(evidence.source))
    blockers.push('SETTLEMENT_NOT_TRUSTED');
  if (!evidence.verifiedByUid || evidence.verifiedByUid !== review.verifierUid ||
      !Number.isFinite(Date.parse(evidence.verifiedAt)) ||
      Date.parse(evidence.verifiedAt) > Date.parse(review.approvalRecordedAt))
    blockers.push('INVALID_VERIFICATION_PROVENANCE');
  return { eligible: blockers.length === 0, blockers };
}
