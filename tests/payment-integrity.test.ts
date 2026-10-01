import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
  assertCapturedPayment,
  assertPaymentAssociation,
  paymentStatusAfterFailure,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  webhookClaimDecision,
} from '../lib/payment-integrity.ts';
import { assertOnlinePaymentEligible } from '../lib/booking-integrity.ts';

const secret='test_secret';
test('accepts only a valid Razorpay payment signature',()=>{
 const order='order_test',payment='pay_test';
 const sig=createHmac('sha256',secret).update(`${order}|${payment}`).digest('hex');
 assert.equal(verifyRazorpayPaymentSignature(order,payment,sig,secret),true);
 assert.equal(verifyRazorpayPaymentSignature(order,payment,'00'.repeat(32),secret),false);
 assert.equal(verifyRazorpayPaymentSignature('order_other',payment,sig,secret),false);
});
test('requires captured INR payment with exact server amount and order',()=>{
 assert.doesNotThrow(()=>assertCapturedPayment({order_id:'order_1',amount:49900,currency:'INR',status:'captured'},'order_1',49900));
 for(const payment of [
  {order_id:'order_2',amount:49900,currency:'INR',status:'captured'},
  {order_id:'order_1',amount:1,currency:'INR',status:'captured'},
  {order_id:'order_1',amount:49900,currency:'USD',status:'captured'},
  {order_id:'order_1',amount:49900,currency:'INR',status:'authorized'},
 ]) assert.throws(()=>assertCapturedPayment(payment,'order_1',49900),/PAYMENT_DETAILS_MISMATCH/);
});
test('rejects cross-booking/order transaction association',()=>{
 assert.doesNotThrow(()=>assertPaymentAssociation({bookingId:'b1',orderId:'o1'},'b1','o1'));
 assert.throws(()=>assertPaymentAssociation({bookingId:'b2',orderId:'o1'},'b1','o1'),/PAYMENT_ASSOCIATION_MISMATCH/);
 assert.throws(()=>assertPaymentAssociation({bookingId:'b1',orderId:'o2'},'b1','o1'),/PAYMENT_ASSOCIATION_MISMATCH/);
});
test('prevents already-paid or ineligible booking from online payment',()=>{
 assert.throws(()=>assertOnlinePaymentEligible({status:'PENDING',workflowStatus:'BOOKING_CREATED',paymentMode:'ONLINE',paymentStatus:'PAID'}),/BOOKING_ALREADY_PAID/);
 assert.throws(()=>assertOnlinePaymentEligible({status:'CONFIRMED',workflowStatus:'BOOKING_CONFIRMED',paymentMode:'ONLINE',paymentStatus:'PENDING'}),/BOOKING_NOT_ONLINE_PAYABLE/);
 assert.throws(()=>assertOnlinePaymentEligible({status:'PENDING',workflowStatus:'BOOKING_CREATED',paymentMode:'CASH',paymentStatus:'PENDING'}),/BOOKING_NOT_ONLINE_PAYABLE/);
 assert.doesNotThrow(()=>assertOnlinePaymentEligible({status:'PENDING',workflowStatus:'BOOKING_CREATED',paymentMode:'ONLINE',paymentStatus:'PENDING'}));
});
test('webhook signature and replay decisions are fail-safe',()=>{
 const raw='{"event":"payment.captured"}';
 const sig=createHmac('sha256',secret).update(raw).digest('hex');
 assert.equal(verifyRazorpayWebhookSignature(raw,sig,secret),true);
 assert.equal(verifyRazorpayWebhookSignature(raw,'bad',secret),false);
 assert.equal(webhookClaimDecision(null),'CLAIM');
 assert.equal(webhookClaimDecision({processedAt:new Date(),processingError:null}),'DUPLICATE');
 assert.equal(webhookClaimDecision({processedAt:null,processingError:'failed'}),'RETRY');
 assert.equal(webhookClaimDecision({processedAt:null,processingError:null}),'IN_PROGRESS');
 assert.equal(paymentStatusAfterFailure('PAID'),'PAID');
 assert.equal(paymentStatusAfterFailure('PENDING'),'FAILED');
});
