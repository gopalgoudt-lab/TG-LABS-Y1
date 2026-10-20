import { validateManualUpiCorrectionAmounts, type ManualUpiCorrectionAmounts } from './manual-upi-correction';

export type ManualUpiCorrectionPreflight = {
  amounts: ManualUpiCorrectionAmounts;
  originalReceiptId: string;
  phonePeEvidenceVerified: boolean;
  bankCreditVerified: boolean;
  discountApproved: boolean;
  existingPaymentRecordsReviewed: boolean;
  originalReceiptPreserved: boolean;
};

/** Pure preflight only. Does not authenticate, approve, update records or issue receipts. */
export function assessManualUpiCorrectionPreflight(input: ManualUpiCorrectionPreflight) {
  const blockers: string[] = [];
  if (!validateManualUpiCorrectionAmounts(input.amounts)) blockers.push('INVALID_AMOUNTS');
  if (!input.originalReceiptId.trim()) blockers.push('ORIGINAL_RECEIPT_REQUIRED');
  if (!input.phonePeEvidenceVerified) blockers.push('PHONEPE_EVIDENCE_UNVERIFIED');
  if (!input.bankCreditVerified) blockers.push('BANK_CREDIT_UNVERIFIED');
  if (!input.discountApproved) blockers.push('DISCOUNT_NOT_APPROVED');
  if (!input.existingPaymentRecordsReviewed) blockers.push('EXISTING_PAYMENT_RECORDS_NOT_REVIEWED');
  if (!input.originalReceiptPreserved) blockers.push('ORIGINAL_RECEIPT_NOT_PRESERVED');
  return { eligibleForFurtherReview: blockers.length === 0, blockers };
}
