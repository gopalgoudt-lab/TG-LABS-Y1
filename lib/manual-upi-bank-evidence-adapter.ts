/**
 * Server-only boundary for independently reconciled manual UPI bank credits.
 * No HTTP request body, screenshot, or admin checkbox is trusted evidence.
 * Implementations must verify against an authenticated bank/provider source.
 */
export type BankCreditVerificationRequest = Readonly<{
  bookingId: string;
  expectedReferenceHash: string;
  expectedReceivingAccountHash: string;
  expectedAmountPaise: number;
}>;

export type VerifiedBankCredit = Readonly<{
  bookingId: string;
  referenceHash: string;
  receivingAccountHash: string;
  amountPaise: number;
  currency: 'INR';
  settled: true;
  source: 'BANK_RECONCILIATION' | 'VERIFIED_PROVIDER';
  verifiedAt: string;
  immutableEvidenceDigest: string;
}>;

export interface TrustedBankEvidenceSource {
  /** Fetch and independently authenticate the credit; never accept browser assertions. */
  verifyCredit(request: BankCreditVerificationRequest): Promise<VerifiedBankCredit | null>;
}

export type BankCreditAssessment =
  | Readonly<{ eligible: true; evidence: VerifiedBankCredit }>
  | Readonly<{ eligible: false; blockers: string[] }>;

const sha256 = /^[a-f0-9]{64}$/i;

export async function assessBankCredit(
  source: TrustedBankEvidenceSource | null,
  request: BankCreditVerificationRequest,
): Promise<BankCreditAssessment> {
  const blockers: string[] = [];
  if (!request.bookingId.trim()) blockers.push('BOOKING_REQUIRED');
  if (!sha256.test(request.expectedReferenceHash)) blockers.push('REFERENCE_HASH_INVALID');
  if (!sha256.test(request.expectedReceivingAccountHash)) blockers.push('ACCOUNT_HASH_INVALID');
  if (!Number.isSafeInteger(request.expectedAmountPaise) || request.expectedAmountPaise <= 0)
    blockers.push('AMOUNT_INVALID');
  if (blockers.length) return { eligible: false, blockers };
  if (!source) return { eligible: false, blockers: ['TRUSTED_BANK_SOURCE_UNAVAILABLE'] };
  try {
    const evidence = await source.verifyCredit(request);
    if (!evidence) return { eligible: false, blockers: ['BANK_CREDIT_NOT_VERIFIED'] };
    if (evidence.bookingId !== request.bookingId) blockers.push('BOOKING_MISMATCH');
    if (evidence.referenceHash !== request.expectedReferenceHash) blockers.push('REFERENCE_MISMATCH');
    if (evidence.receivingAccountHash !== request.expectedReceivingAccountHash) blockers.push('ACCOUNT_MISMATCH');
    if (evidence.amountPaise !== request.expectedAmountPaise || !Number.isSafeInteger(evidence.amountPaise))
      blockers.push('AMOUNT_MISMATCH');
    if (evidence.currency !== 'INR' || evidence.settled !== true ||
        !['BANK_RECONCILIATION', 'VERIFIED_PROVIDER'].includes(evidence.source))
      blockers.push('SETTLEMENT_NOT_TRUSTED');
    if (!Number.isFinite(Date.parse(evidence.verifiedAt)) ||
        Date.parse(evidence.verifiedAt) > Date.now())
      blockers.push('VERIFICATION_TIMESTAMP_INVALID');
    if (!sha256.test(evidence.immutableEvidenceDigest))
      blockers.push('EVIDENCE_DIGEST_INVALID');
    return blockers.length ? { eligible: false, blockers } : { eligible: true, evidence };
  } catch {
    return { eligible: false, blockers: ['TRUSTED_BANK_SOURCE_FAILED'] };
  }
}
