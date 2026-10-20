import { createHash } from 'node:crypto';
import { validateVerifiedManualUpiAmounts, type VerifiedManualUpiAmounts } from './manual-upi-verified-amounts';
import type { PrismaClient } from '@prisma/client';
import { assessTrustedManualUpiApproval, type TrustedApprovalGateInput } from './manual-upi-trusted-approval-gate';

/** A trusted back-office provider, NOT browser input or a request body.
 * Implementation must independently authenticate the reviewer, verify bank and
 * PhonePe evidence, and establish discount authority. */
export interface TrustedManualUpiEvidenceProvider {
  verify(input: { bookingId: string; originalReceiptHash: string }): Promise<TrustedApprovalGateInput>;
  /** Independently reconciled amounts, not derived from client-submitted fields. */
  verifyAmounts?(input: { bookingId: string; originalReceiptHash: string }): Promise<VerifiedManualUpiAmounts>;
}

export type ManualUpiIssuanceReadiness = {
  eligible: boolean;
  blockers: string[];
  originalReceiptHash?: string;
};

/** Read-only issuance preflight. No approval or adjustment is persisted here.
 * Do not wire financial writes until a real trusted provider and atomic issuance
 * implementation have been reviewed and integration-tested. */
export async function checkManualUpiIssuanceReadiness(
  prisma: PrismaClient,
  bookingId: string,
  provider: TrustedManualUpiEvidenceProvider | null,
): Promise<ManualUpiIssuanceReadiness> {
  if (!bookingId) return { eligible: false, blockers: ['BOOKING_ID_REQUIRED'] };
  if (!provider) return { eligible: false, blockers: ['TRUSTED_EVIDENCE_PROVIDER_UNAVAILABLE'] };
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { paymentStatus: true, totalAmount: true, paymentReceiptSnapshot: true },
  });
  if (!booking || booking.paymentStatus !== 'PAID' || !booking.paymentReceiptSnapshot)
    return { eligible: false, blockers: ['FROZEN_PAID_BOOKING_REQUIRED'] };
  const snapshot = booking.paymentReceiptSnapshot;
  if (typeof snapshot !== 'object' || Array.isArray(snapshot) || snapshot === null ||
      !('total' in snapshot) || snapshot.total !== booking.totalAmount)
    return { eligible: false, blockers: ['FROZEN_RECEIPT_TOTAL_MISMATCH'] };
  const originalReceiptHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  // Provider errors fail closed; do not return or log sensitive evidence.
  try {
    const verified = await provider.verify({ bookingId, originalReceiptHash });
    if (verified.evidence.originalReceiptEvidenceReference !== originalReceiptHash)
      return { eligible: false, blockers: ['RECEIPT_EVIDENCE_MISMATCH'] };
    const result = assessTrustedManualUpiApproval(verified);
    if (!result.eligibleForTrustedApprovalIssuance)
      return { eligible: false, blockers: result.blockers, originalReceiptHash };
    if (!provider.verifyAmounts)
      return { eligible: false, blockers: ['VERIFIED_MONETARY_PROVIDER_UNAVAILABLE'], originalReceiptHash };
    const amounts = await provider.verifyAmounts({ bookingId, originalReceiptHash });
    const monetary = validateVerifiedManualUpiAmounts(amounts);
    if (amounts.bookingId !== bookingId)
      monetary.blockers.push('MONETARY_BOOKING_MISMATCH');
    // Readiness does not authorize issuance: no persistence until reviewed atomic write path exists.
    return { eligible: false, blockers: monetary.blockers.length ? monetary.blockers : ['ATOMIC_APPROVAL_ISSUANCE_NOT_IMPLEMENTED'], originalReceiptHash };
  } catch {
    return { eligible: false, blockers: ['TRUSTED_EVIDENCE_VERIFICATION_FAILED'] };
  }
}
