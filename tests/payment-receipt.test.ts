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
    receiptNumber: 'TGR-DEMO000001',
    bookingReference: 'TG-DEMO0001',
    receiptDate: new Date('2026-09-08T08:00:00.000Z'),
    patientName: 'Test Patient',
    age: 35,
    gender: 'Male',
    doctorName: 'Self',
    email: 'test@example.com',
    phone: '9000000000',
    collectionMode: 'HOME',
    paymentMode: 'UPI',
    paymentStatus: 'PAID',
    transactionReference: 'pay_demo_001',
    lines: [{ name: 'Complete Blood Count', amount: 300 }],
    subtotal: 300,
    discount: 50,
    total: 250,
    paidAmount: 250,
    due: 0,
    partners: ['TG Labs'],
  });
  assert.ok(bytes.length > 500);
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
});

test('patient endpoint enforces ownership and paid-status guard', () => {
  const route = readFileSync(new URL('../app/api/patient/bookings/[id]/receipt/route.ts', import.meta.url), 'utf8');
  assert.ok(route.includes('verifyFirebasePatientRequest'));
  assert.ok(route.includes('patient: { phone: identity.databasePhone }'));
  assert.ok(route.includes('isReceiptAvailable(booking.paymentStatus)'));
  assert.ok(route.includes("'Cache-Control': 'private, no-store'"));
});

test('patient and admin interfaces expose receipt actions only for paid bookings', () => {
  const patient = readFileSync(new URL('../app/patient/page.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../app/admin/bookings/page.tsx', import.meta.url), 'utf8');
  assert.ok(patient.includes("o.paymentStatus === 'PAID'"));
  assert.ok(patient.includes('Download payment receipt'));
  assert.ok(admin.includes("b.paymentStatus==='PAID'"));
  assert.ok(admin.includes('Receipt PDF'));
});
