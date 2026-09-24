import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const order = read('../app/api/payments/razorpay/order/route.ts');
const verify = read('../app/api/payments/razorpay/verify/route.ts');
const webhook = read('../app/api/webhooks/razorpay/route.ts');
const compatibilityWebhook = read('../app/api/payments/razorpay/webhook/route.ts');
const integrity = read('../lib/payment-integrity.ts');
const receipt = read('../app/api/patient/bookings/[id]/receipt/route.ts');

test('online payment order creation remains deliberately disabled for launch', () => {
  assert.ok(order.includes('RAZORPAY_TEMPORARILY_DISABLED'));
  assert.ok(order.includes('cash or UPI at sample collection'));
  assert.ok(order.includes('{ status: 503 }'));
});

test('payment verification is patient-authenticated and booking-owner scoped', () => {
  assert.ok(verify.includes('verifyFirebasePatientRequest(request)'));
  assert.ok(verify.includes('assertBookingOwner(booking.patient.phone, identity.databasePhone)'));
  assert.ok(verify.includes('booking.razorpayOrderId !== body.razorpay_order_id'));
  assert.ok(verify.includes('assertOnlinePaymentEligible(booking)'));
});

test('payment verification requires signature plus captured Razorpay amount/currency/order integrity', () => {
  assert.ok(verify.includes('verifyRazorpayPaymentSignature'));
  assert.ok(verify.includes('assertCapturedPayment(payment, booking.razorpayOrderId, expectedAmount)'));
  assert.ok(integrity.includes("createHmac('sha256', secret)"));
  assert.ok(integrity.includes('timingSafeEqual'));
  assert.ok(integrity.includes("payment.currency !== 'INR'"));
  assert.ok(integrity.includes("payment.status !== 'captured'"));
});

test('paid booking verification is idempotent and rejects a different second payment', () => {
  assert.ok(verify.includes("booking.paymentStatus === 'PAID' && booking.razorpayPaymentId === body.razorpay_payment_id"));
  assert.ok(verify.includes("booking.paymentStatus === 'PAID' && booking.razorpayPaymentId !== body.razorpay_payment_id"));
  assert.ok(verify.includes('already paid with a different payment'));
});

test('canonical webhook verifies raw-body signature and claims event ids idempotently', () => {
  assert.ok(webhook.includes("const rawBody = await request.text()"));
  assert.ok(webhook.includes("request.headers.get('x-razorpay-signature')"));
  assert.ok(webhook.includes("request.headers.get('x-razorpay-event-id')"));
  assert.ok(webhook.includes('verifyRazorpayWebhookSignature(rawBody, signature, secret)'));
  assert.ok(webhook.includes("error.code === 'P2002'"));
  assert.ok(compatibilityWebhook.includes("from '@/app/api/webhooks/razorpay/route'"));
});

test('captured webhook reconciles authoritative booking total and payment association', () => {
  assert.ok(webhook.includes('const expectedAmount = booking.totalAmount * 100'));
  assert.ok(webhook.includes('assertCapturedPayment(payment, payment.order_id, expectedAmount)'));
  assert.ok(webhook.includes('assertPaymentAssociation(existingByPayment, booking.id, payment.order_id)'));
  assert.ok(webhook.includes("paymentStatus: 'PAID'"));
});

test('failed payment webhook cannot downgrade an already-paid booking', () => {
  assert.ok(integrity.includes("return currentStatus === 'PAID' ? 'PAID' : 'FAILED'"));
  assert.ok(webhook.includes("booking.paymentStatus === 'PAID'"));
});

test('notification failure cannot roll back a successful payment reconciliation', () => {
  assert.ok(verify.includes('Payment succeeded but WhatsApp confirmation failed'));
  assert.ok(webhook.includes('Webhook reconciled payment but WhatsApp confirmation failed'));
});

test('patient receipt is authenticated, owner-scoped, PAID-only and private/no-store', () => {
  assert.ok(receipt.includes('verifyFirebasePatientRequest(request)'));
  assert.ok(receipt.includes('patient: { phone: identity.databasePhone }'));
  assert.ok(receipt.includes('Payment receipt is available after payment is marked PAID.'));
  assert.ok(receipt.includes("'Cache-Control': 'private, no-store'"));
  assert.ok(receipt.includes("'Content-Type': 'application/pdf'"));
});
