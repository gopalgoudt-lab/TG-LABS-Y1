import { validateManualUpiCorrectionAmounts, type ManualUpiCorrectionAmounts } from './manual-upi-correction';

export type CorrectedManualUpiReceipt = {
  version: 2;
  type: 'CORRECTED_RECEIPT';
  originalReceiptId: string;
  grossAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: 0;
  paymentMethod: 'UPI';
  paymentProvider: 'PHONEPE';
  collectionAccountType: 'OWNER_ON_BEHALF_OF_BUSINESS';
};

/** Pure formatting input only. This function does not verify payment or issue a receipt. */
export function buildCorrectedManualUpiReceipt(
  amounts: ManualUpiCorrectionAmounts,
  originalReceiptId: string,
): CorrectedManualUpiReceipt {
  if (!validateManualUpiCorrectionAmounts(amounts)) throw new Error('INVALID_CORRECTION_AMOUNTS');
  if (!originalReceiptId.trim()) throw new Error('ORIGINAL_RECEIPT_REQUIRED');
  return {
    version: 2,
    type: 'CORRECTED_RECEIPT',
    originalReceiptId: originalReceiptId.trim(),
    grossAmount: amounts.originalGrossAmount,
    discountAmount: amounts.discountAmount,
    totalAmount: amounts.correctedNetAmount,
    paidAmount: amounts.verifiedPaidAmount,
    dueAmount: 0,
    paymentMethod: 'UPI',
    paymentProvider: 'PHONEPE',
    collectionAccountType: 'OWNER_ON_BEHALF_OF_BUSINESS',
  };
}
