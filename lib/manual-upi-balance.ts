/**
 * Read-only reconciliation for a manual UPI booking correction.
 * All inputs and outputs are integer paise. Never infer a discount from a short payment.
 * This helper does not change payment status, receipts, or database records.
 */
export type ManualUpiBalance = Readonly<{
  originalGrossPaise: number;
  verifiedPaidPaise: number;
  approvedDiscountPaise: number;
  outstandingPaise: number;
  settlement: 'PARTIAL' | 'SETTLED';
}>;

export function calculateManualUpiBalance(input: {
  originalGrossPaise: number;
  verifiedPaidPaise: number;
  approvedDiscountPaise: number;
  discountAuthorized: boolean;
}): ManualUpiBalance {
  const { originalGrossPaise, verifiedPaidPaise, approvedDiscountPaise, discountAuthorized } = input;
  if (![originalGrossPaise, verifiedPaidPaise, approvedDiscountPaise].every(
    value => Number.isSafeInteger(value) && value >= 0
  ) || originalGrossPaise <= 0) {
    throw new Error('INVALID_FINANCIAL_AMOUNT');
  }
  if (approvedDiscountPaise > 0 && discountAuthorized !== true) {
    throw new Error('DISCOUNT_NOT_AUTHORIZED');
  }
  const remaining = originalGrossPaise - verifiedPaidPaise;
  if (!Number.isSafeInteger(remaining) || remaining < 0 || approvedDiscountPaise > remaining) {
    throw new Error('PAYMENT_EXCEEDS_BOOKING');
  }
  const outstandingPaise = remaining - approvedDiscountPaise;
  return {
    originalGrossPaise,
    verifiedPaidPaise,
    approvedDiscountPaise,
    outstandingPaise,
    settlement: outstandingPaise === 0 ? 'SETTLED' : 'PARTIAL',
  };
}
