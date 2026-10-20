export type ManualUpiCorrectionAmounts = {
  originalGrossAmount: number;
  discountAmount: number;
  correctedNetAmount: number;
  verifiedPaidAmount: number;
};

/** Validates rupee amounts only; never authorizes or executes a financial write. */
export function validateManualUpiCorrectionAmounts(input: ManualUpiCorrectionAmounts): boolean {
  const values = Object.values(input);
  if (!values.every(value => Number.isSafeInteger(value) && value >= 0)) return false;
  if (input.originalGrossAmount <= 0 || input.correctedNetAmount <= 0) return false;
  if (input.discountAmount > input.originalGrossAmount) return false;
  return input.originalGrossAmount - input.discountAmount === input.correctedNetAmount
    && input.verifiedPaidAmount === input.correctedNetAmount;
}
