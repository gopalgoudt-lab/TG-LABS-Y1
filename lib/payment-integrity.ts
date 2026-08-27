import { createHmac, timingSafeEqual } from 'crypto';

export function safeEqualHex(a: string, b: string) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}

export function assertPaymentAssociation(
  transaction: { bookingId: string; orderId: string } | null,
  bookingId: string,
  orderId: string,
) {
  if (transaction && (transaction.bookingId !== bookingId || transaction.orderId !== orderId)) {
    throw new Error('PAYMENT_ASSOCIATION_MISMATCH');
  }
}

export function assertCapturedPayment(
  payment: { order_id?: string; amount?: number; currency?: string; status?: string },
  orderId: string,
  expectedAmount: number,
) {
  if (
    payment.order_id !== orderId ||
    payment.amount !== expectedAmount ||
    payment.currency !== 'INR' ||
    payment.status !== 'captured'
  ) {
    throw new Error('PAYMENT_DETAILS_MISMATCH');
  }
}

export function paymentStatusAfterFailure(currentStatus: string) {
  return currentStatus === 'PAID' ? 'PAID' : 'FAILED';
}

export function webhookClaimDecision(existing: { processedAt: Date | null; processingError: string | null } | null) {
  if (!existing) return 'CLAIM';
  if (existing.processedAt && !existing.processingError) return 'DUPLICATE';
  if (existing.processingError) return 'RETRY';
  return 'IN_PROGRESS';
}
