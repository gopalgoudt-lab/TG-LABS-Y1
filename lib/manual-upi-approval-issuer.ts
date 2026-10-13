import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { assessTrustedManualUpiApproval } from './manual-upi-trusted-approval-gate';
import type { TrustedManualUpiEvidenceProvider } from './manual-upi-approval-issuance-readiness';

/**
 * Internal-only approval issuer. Never call from a browser-facing route until a
 * reviewed, authenticated bank-reconciliation provider has been installed.
 * This does not adjust balances or issue corrected receipts.
 */
export async function issueTrustedManualUpiApproval(
  prisma: PrismaClient,
  bookingId: string,
  provider: TrustedManualUpiEvidenceProvider | null,
) {
  if (!bookingId || !provider) throw new Error('TRUSTED_EVIDENCE_PROVIDER_REQUIRED');
  return prisma.$transaction(async tx => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { paymentStatus: true, totalAmount: true, paymentReceiptSnapshot: true },
    });
    if (!booking || booking.paymentStatus !== 'PAID' || !booking.paymentReceiptSnapshot)
      throw new Error('FROZEN_PAID_BOOKING_REQUIRED');
    const snapshot = booking.paymentReceiptSnapshot;
    if (typeof snapshot !== 'object' || Array.isArray(snapshot) ||
        !('total' in snapshot) || snapshot.total !== booking.totalAmount)
      throw new Error('FROZEN_RECEIPT_TOTAL_MISMATCH');
    const originalReceiptHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
    // The provider must authenticate staff and reconcile bank records independently.
    // Never substitute browser-supplied flags or a PhonePe screenshot.
    const verified = await provider.verify({ bookingId, originalReceiptHash });
    if (verified.evidence.originalReceiptEvidenceReference !== originalReceiptHash)
      throw new Error('RECEIPT_EVIDENCE_MISMATCH');
    const assessment = assessTrustedManualUpiApproval(verified);
    if (!assessment.eligibleForTrustedApprovalIssuance)
      throw new Error('TRUSTED_APPROVAL_BLOCKED');

    // No inferred discount: the provider must independently authorize its value.
    // This interface currently supplies no independently verified monetary
    // approval payload, so issuance MUST fail closed until it is extended.
    throw new Error('VERIFIED_APPROVAL_AMOUNTS_NOT_IMPLEMENTED');
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 });
}
