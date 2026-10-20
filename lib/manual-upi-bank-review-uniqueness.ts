/** Independent bank review transaction preflight.
 * This is a read-only check; database constraints must be enforced again inside
 * a future serializable insert transaction. NEVER treat it as authorization to
 * persist evidence, approve a discount, or modify a paid booking.
 */
export type BankReviewExistingRecord = Readonly<{
  bookingId: string;
  paymentReferenceHmac: string;
}>;

export function assessBankReviewUniqueness(input: Readonly<{
  bookingId: string;
  paymentReferenceHmac: string;
  existingBookingReview: BankReviewExistingRecord | null;
  existingReferenceReview: BankReviewExistingRecord | null;
}>): { eligibleForTransactionalInsert: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!input.bookingId?.trim() || !/^[a-f0-9]{64}$/i.test(input.paymentReferenceHmac))
    blockers.push('INVALID_BANK_REVIEW_KEY');
  if (input.existingBookingReview) blockers.push('BOOKING_ALREADY_HAS_BANK_REVIEW');
  if (input.existingReferenceReview) blockers.push('PAYMENT_REFERENCE_ALREADY_ASSIGNED');
  // Even when eligible, the future writer must use database unique constraints
  // and a serializable transaction to eliminate concurrent insertion races.
  return { eligibleForTransactionalInsert: blockers.length === 0, blockers };
}

export function classifyBankReviewUniqueConflict(error: unknown): 'DUPLICATE_REVIEW' | 'UNEXPECTED_ERROR' {
  if (error && typeof error === 'object' && 'code' in error &&
      (error as { code?: unknown }).code === 'P2002') return 'DUPLICATE_REVIEW';
  return 'UNEXPECTED_ERROR';
}
