import type { Prisma } from '@prisma/client';

export type ManualUpiCorrectionAuditInput = {
  bookingId: string;
  adjustmentId: string;
  approvedByPhone: string;
  previousGrossAmount: number;
  discountAmount: number;
  correctedNetAmount: number;
  paymentReferenceHash: string;
  approvalId: string;
};

/** Build audit data for prisma.$transaction([...]) or interactive tx.adminAuditLog.create().
 * NEVER use the best-effort writeAdminAudit helper for a financial correction.
 * The caller must authenticate the actor and verify the approval record first.
 */
export function manualUpiCorrectionAuditData(input: ManualUpiCorrectionAuditInput) {
  return {
    adminPhone: input.approvedByPhone,
    action: 'MANUAL_UPI_FINANCIAL_CORRECTION',
    entityType: 'Booking',
    entityId: input.bookingId,
    summary: 'Approved manual UPI financial correction with original receipt retained',
    metadata: {
      adjustmentId: input.adjustmentId,
      approvalId: input.approvalId,
      previousGrossAmount: input.previousGrossAmount,
      discountAmount: input.discountAmount,
      correctedNetAmount: input.correctedNetAmount,
      paymentReferenceHash: input.paymentReferenceHash,
    } satisfies Prisma.InputJsonObject,
  };
}
