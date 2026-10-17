/**
 * Trusted monetary approval contract. Values must originate from an authenticated
 * server-side reconciliation provider, never a browser request.
 * Amounts use integer paise; this validator performs no database writes.
 */
export type VerifiedManualUpiAmounts = Readonly<{
  bookingId: string;
  originalGrossPaise: number;
  verifiedPaidPaise: number;
  approvedDiscountPaise: number;
  outstandingPaise: number;
  bankSettlementConfirmed: boolean;
  discountExplicitlyAuthorized: boolean;
  personalAccountCollectionAuthorized: boolean;
  collectionAccountType: 'PERSONAL' | 'BUSINESS';
  bankEvidenceDigest: string;
  authorizedByUid: string;
  verifiedByUid: string;
  requestedByUid: string;
}>;

export function validateVerifiedManualUpiAmounts(input: VerifiedManualUpiAmounts) {
  const blockers: string[] = [];
  const amounts = [input.originalGrossPaise, input.verifiedPaidPaise,
    input.approvedDiscountPaise, input.outstandingPaise];
  if (amounts.some(n => !Number.isSafeInteger(n) || n < 0) ||
      input.originalGrossPaise <= 0 ||
      input.verifiedPaidPaise + input.approvedDiscountPaise + input.outstandingPaise !== input.originalGrossPaise)
    blockers.push('INVALID_FINANCIAL_RECONCILIATION');
  if (!input.bookingId || !input.bankEvidenceDigest)
    blockers.push('TRUSTED_EVIDENCE_REQUIRED');
  const ids = [input.requestedByUid, input.verifiedByUid, input.authorizedByUid];
  if (ids.some(id => !id?.trim()) || new Set(ids).size !== 3)
    blockers.push('INDEPENDENT_STAFF_REQUIRED');
  if (input.bankSettlementConfirmed !== true)
    blockers.push('BANK_SETTLEMENT_NOT_CONFIRMED');
  if (input.approvedDiscountPaise > 0 && input.discountExplicitlyAuthorized !== true)
    blockers.push('DISCOUNT_NOT_AUTHORIZED');
  if (input.collectionAccountType === 'PERSONAL' && input.personalAccountCollectionAuthorized !== true)
    blockers.push('PERSONAL_COLLECTION_NOT_AUTHORIZED');
  if (!['PERSONAL', 'BUSINESS'].includes(input.collectionAccountType))
    blockers.push('INVALID_COLLECTION_ACCOUNT');
  return { eligible: blockers.length === 0, blockers };
}
