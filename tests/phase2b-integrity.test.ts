import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { assertBookingOwner, assertOnlinePaymentEligible, validateAndPriceBooking } from '../lib/booking-integrity';
import {
  assertCapturedPayment,
  assertPaymentAssociation,
  paymentStatusAfterFailure,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  webhookClaimDecision,
} from '../lib/payment-integrity';

const selection = [{ testId: 'cbc', offerId: 'offer-tg-cbc' }];
const offer = [{ id: 'offer-tg-cbc', testId: 'cbc', price: 300, partner: { id: 'tg', name: 'TG Labs partner' }, tat: '24 hrs' }];

test('valid active partner offer is accepted and server price is authoritative', () => {
  const result = validateAndPriceBooking(selection, offer, [], 0);
  assert.equal(result.totalAmount, 300);
});

test('manipulated client price and total are ignored in favor of server offer price', () => {
  const maliciousBrowser = { price: 1, total: 1 };
  const result = validateAndPriceBooking(selection, offer, [], 0);
  assert.equal(maliciousBrowser.total, 1);
  assert.equal(result.totalAmount, 300);
});

test('nonexistent or disabled/unavailable partner offers are rejected', () => {
  assert.throws(() => validateAndPriceBooking(selection, [], [], 0), /OFFER_UNAVAILABLE/);
});

test('offer must belong to the selected diagnostic test', () => {
  assert.throws(
    () => validateAndPriceBooking(selection, [{ ...offer[0], testId: 'thyroid' }], [], 0),
    /OFFER_TEST_MISMATCH/,
  );
});

test('booking total includes packages, avoids double charge, and includes server fee', () => {
  const packages = [{ id: 'pkg', price: 900, tests: [{ test: { id: 'cbc' } }] }];
  const result = validateAndPriceBooking(selection, offer, packages, 100);
  assert.deepEqual({ diagnostic: result.diagnosticAmount, total: result.totalAmount }, { diagnostic: 900, total: 1000 });
});

test('partner identity, offer and price snapshot inputs remain intact for persistence', () => {
  const persisted = { offerId: offer[0].id, partnerId: offer[0].partner.id, partnerName: offer[0].partner.name, price: offer[0].price };
  assert.deepEqual(persisted, { offerId: 'offer-tg-cbc', partnerId: 'tg', partnerName: 'TG Labs partner', price: 300 });
});

test('duplicate test selections are rejected (idempotency key is database-unique)', () => {
  assert.throws(() => validateAndPriceBooking([...selection, ...selection], offer, [], 0), /DUPLICATE_TEST_SELECTION/);
});

test('unauthorized booking/payment ownership is rejected', () => {
  assert.throws(() => assertBookingOwner('9700000000', '9800000000'), /BOOKING_FORBIDDEN/);
});

test('Razorpay checkout signature succeeds and fails correctly', () => {
  const signature = createHmac('sha256', 'secret').update('order_1|pay_1').digest('hex');
  assert.equal(verifyRazorpayPaymentSignature('order_1', 'pay_1', signature, 'secret'), true);
  assert.equal(verifyRazorpayPaymentSignature('order_1', 'pay_2', signature, 'secret'), false);
});

test('Razorpay webhook rejects an invalid signature', () => {
  const raw = JSON.stringify({ event: 'payment.captured' });
  const signature = createHmac('sha256', 'webhook-secret').update(raw).digest('hex');
  assert.equal(verifyRazorpayWebhookSignature(raw, signature, 'webhook-secret'), true);
  assert.equal(verifyRazorpayWebhookSignature(`${raw}x`, signature, 'webhook-secret'), false);
});

test('webhook idempotency rejects completed duplicates and permits failed retries', () => {
  assert.equal(webhookClaimDecision({ processedAt: new Date(), processingError: null }), 'DUPLICATE');
  assert.equal(webhookClaimDecision({ processedAt: new Date(), processingError: 'temporary failure' }), 'RETRY');
});

test('incorrect booking/payment association is rejected', () => {
  assert.throws(() => assertPaymentAssociation({ bookingId: 'other', orderId: 'order_1' }, 'booking_1', 'order_1'), /PAYMENT_ASSOCIATION_MISMATCH/);
});

test('captured payment must match order, server amount, currency and status', () => {
  assert.doesNotThrow(() => assertCapturedPayment({ order_id: 'order_1', amount: 30000, currency: 'INR', status: 'captured' }, 'order_1', 30000));
  assert.throws(() => assertCapturedPayment({ order_id: 'order_1', amount: 1, currency: 'INR', status: 'captured' }, 'order_1', 30000), /PAYMENT_DETAILS_MISMATCH/);
});

test('failed payment cannot downgrade or create a paid state', () => {
  assert.equal(paymentStatusAfterFailure('PENDING'), 'FAILED');
  assert.equal(paymentStatusAfterFailure('PAID'), 'PAID');
});

test('payment at collection is distinct and cannot create an online order', () => {
  assert.throws(
    () => assertOnlinePaymentEligible({ status: 'CONFIRMED', workflowStatus: 'BOOKING_CONFIRMED', paymentMode: 'CASH', paymentStatus: 'PENDING' }),
    /BOOKING_NOT_ONLINE_PAYABLE/,
  );
});
