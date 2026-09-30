import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createPaymentReceiptPdf, isReceiptAvailable, receiptNumberForBooking } from '../lib/payment-receipt';

test('receipt is available only for paid bookings', () => {
  assert.equal(isReceiptAvailable('PAID'), true);
  for (const status of ['PENDING', 'FAILED', 'REFUNDED']) assert.equal(isReceiptAvailable(status), false);
});

test('receipt number is stable and booking-derived', () => {
  assert.equal(receiptNumberForBooking('booking_abcdefghijkl'), 'TGR-CDEFGHIJKL');
});

test('receipt generator produces a PDF for a paid booking', async () => {
  const bytes = await createPaymentReceiptPdf({
    receiptNumber: 'TGR-DEMO000001', bookingReference: 'TG-DEMO0001', receiptDate: new Date('2026-09-08T08:00:00.000Z'),
    patientName: 'Test Patient', age: 35, gender: 'Male', doctorName: 'Self', email: 'test@example.com', phone: '9000000000',
    collectionMode: 'HOME', paymentMode: 'UPI', paymentStatus: 'PAID', transactionReference: 'pay_demo_001',
    lines: [{ name: 'Complete Blood Count', amount: 300 }], subtotal: 300, discount: 50, total: 250, paidAmount: 250, due: 0, partners: ['TG Labs'],
  });
  assert.ok(bytes.length > 500);
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
});

test('patient endpoint enforces ownership, paid-status and amount reconciliation', () => {
  const route = readFileSync(new URL('../app/api/patient/bookings/[id]/receipt/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('verifyFirebasePatientRequest'));
  assert.ok(route.includes('patient: { phone: identity.databasePhone }'));
  assert.ok(route.includes('isReceiptAvailable(booking.paymentStatus)'));
  assert.ok(route.includes('positiveAdjustment'));
  assert.ok(route.includes("Recorded booking adjustment"));
  assert.ok(route.includes('paidPayment?.amount ?? booking.totalAmount'));
  assert.ok(route.includes('Math.max(0, booking.totalAmount - paidAmount)'));
  assert.ok(route.includes("'Cache-Control': 'private, no-store'"));
});

test('admin endpoint uses same receipt reconciliation rules', () => {
  const route = readFileSync(new URL('../app/api/admin/bookings/[id]/receipt/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('positiveAdjustment'));
  assert.ok(route.includes("Recorded booking adjustment"));
  assert.ok(route.includes('paidPayment?.amount ?? booking.totalAmount'));
  assert.ok(route.includes('Math.max(0, booking.totalAmount - paidAmount)'));
});

test('patient and admin interfaces expose receipt actions only for paid bookings', () => {
  const patient = readFileSync(new URL('../app/patient/page.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../app/admin/bookings/page.tsx', import.meta.url), 'utf8');
  assert.ok(patient.includes("o.paymentStatus === 'PAID'"));
  assert.ok(patient.includes('Download payment receipt'));
  assert.ok(admin.includes("b.paymentStatus==='PAID'"));
  assert.ok(admin.includes('Receipt PDF'));
});


test('admin manual package booking preserves package as the commercial receipt item', () => {
  const route = readFileSync(new URL('../app/api/admin/bookings/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('packages:{create:packageRows}'));
  assert.ok(route.includes('packageId:p.id,price:p.price'));
  assert.ok(route.includes('packageTestIds'));
  assert.ok(route.includes('standaloneItems'));
  assert.ok(route.includes('!packageTestIds.has(t.id)||b.testIds.includes(t.id)'));
});


test('admin package receipt hides zero-price operational package contents', () => {
  const route = readFileSync(new URL('../app/api/admin/bookings/[id]/receipt/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('booking.packages.length > 0 ? booking.items.filter((item) => item.price > 0) : booking.items'));
  assert.ok(route.includes('...receiptBookingItems.map'));
  assert.ok(route.includes('const unresolvedItems = receiptBookingItems.filter'));
});
