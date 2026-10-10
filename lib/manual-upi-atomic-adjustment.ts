import { Prisma, type PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { manualUpiCorrectionAuditData } from './manual-upi-transaction-audit';
import { validateManualUpiCorrectionAmounts } from './manual-upi-correction';
import { validateManualUpiApprovalEvidence } from './manual-upi-approval-evidence';

export type ApprovedManualUpiAdjustmentCommand = {
  bookingId: string;
  correctionKey: string;
  approvedByUid: string;
  approvedByPhone: string;
  expectedOriginalGrossAmount: number;
  expectedOriginalReceiptHash: string;
};

/** Internal service only: never call with browser-asserted approvals or evidence. */
export async function applyApprovedManualUpiAdjustment(
  prisma: PrismaClient,
  command: ApprovedManualUpiAdjustmentCommand,
) {
  if (!command.bookingId || !command.correctionKey || !command.approvedByUid ||
      !command.approvedByPhone || !command.expectedOriginalReceiptHash)
    throw new Error('INVALID_ADJUSTMENT_COMMAND');

  return prisma.$transaction(async tx => {
    const booking = await tx.booking.findUnique({
      where: { id: command.bookingId },
      select: { id: true, paymentStatus: true, totalAmount: true, paymentReceiptSnapshot: true },
    });
    if (!booking || booking.paymentStatus !== 'PAID') throw new Error('PAID_BOOKING_REQUIRED');
    if (booking.totalAmount !== command.expectedOriginalGrossAmount) throw new Error('BOOKING_TOTAL_CHANGED');
    if (!booking.paymentReceiptSnapshot) throw new Error('FROZEN_RECEIPT_REQUIRED');

    const receiptHash = createHash('sha256')
      .update(JSON.stringify(booking.paymentReceiptSnapshot)).digest('hex');
    if (receiptHash !== command.expectedOriginalReceiptHash) throw new Error('RECEIPT_EVIDENCE_CHANGED');

    const approval = await tx.manualUpiCorrectionApproval.findUnique({
      where: { bookingId: command.bookingId },
    });
    if (!approval || approval.approvedByUid !== command.approvedByUid ||
        approval.originalReceiptHash !== receiptHash)
      throw new Error('TRUSTED_APPROVAL_REQUIRED');

    const amounts = {
      originalGrossAmount: booking.totalAmount,
      discountAmount: approval.discountAmount,
      correctedNetAmount: booking.totalAmount - approval.discountAmount,
      verifiedPaidAmount: approval.verifiedPaidAmount,
    };
    if (!validateManualUpiCorrectionAmounts(amounts)) throw new Error('INVALID_APPROVED_AMOUNTS');
    const review = validateManualUpiApprovalEvidence({
      requestedByUid: approval.requestedByUid,
      approvedByUid: approval.approvedByUid,
      verifiedByUid: approval.paymentVerifiedByUid,
      paymentReferenceHash: approval.phonePeReferenceHash,
      bankCreditEvidenceReference: approval.bankCreditEvidenceRef,
      originalReceiptEvidenceReference: approval.originalReceiptHash,
      reason: approval.approvalReason,
      approvalRecordedAt: approval.approvedAt.toISOString(),
    });
    if (!review.eligibleForIndependentReview) throw new Error('INCOMPLETE_INDEPENDENT_APPROVAL');

    const existing = await tx.bookingFinancialAdjustment.findUnique({
      where: { bookingId: command.bookingId },
    });
    if (existing) {
      if (existing.correctionKey === command.correctionKey) return { adjustmentId: existing.id, unchanged: true };
      throw new Error('BOOKING_ALREADY_ADJUSTED');
    }
    const adjustment = await tx.bookingFinancialAdjustment.create({
      data: {
        bookingId: command.bookingId,
        correctionKey: command.correctionKey,
        originalGrossAmount: amounts.originalGrossAmount,
        discountAmount: amounts.discountAmount,
        correctedNetAmount: amounts.correctedNetAmount,
        verifiedPaidAmount: amounts.verifiedPaidAmount,
        paymentMethod: 'UPI',
        collectionAccountType: 'OWNER_ON_BEHALF_OF_BUSINESS',
        paymentReferenceHash: approval.phonePeReferenceHash,
        evidenceReference: approval.bankCreditEvidenceRef,
        originalReceiptHash: receiptHash,
        reason: approval.approvalReason,
        approvedBy: approval.approvedByUid,
        approvedAt: approval.approvedAt,
      },
    });
    await tx.adminAuditLog.create({
      data: manualUpiCorrectionAuditData({
        bookingId: command.bookingId,
        adjustmentId: adjustment.id,
        approvedByPhone: command.approvedByPhone,
        previousGrossAmount: amounts.originalGrossAmount,
        discountAmount: amounts.discountAmount,
        correctedNetAmount: amounts.correctedNetAmount,
        paymentReferenceHash: approval.phonePeReferenceHash,
        approvalId: approval.id,
      }),
    });
    return { adjustmentId: adjustment.id, unchanged: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
}
