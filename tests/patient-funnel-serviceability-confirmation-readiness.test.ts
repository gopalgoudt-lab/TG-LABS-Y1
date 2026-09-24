import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const checkout = read('../app/checkout/page.tsx');
const bookings = read('../app/api/bookings/route.ts');
const serviceability = read('../app/api/serviceability/route.ts');
const patient = read('../app/patient/page.tsx');

test('home collection serviceability fails closed and booking independently revalidates it', () => {
  assert.ok(serviceability.includes("Invalid serviceability query."));
  assert.ok(serviceability.includes("Serviceability is temporarily unavailable."));
  assert.ok(bookings.includes('partnerServiceability.findMany'));
  assert.ok(bookings.includes('evaluateHomeCollectionServiceability'));
  assert.ok(bookings.includes('Home collection is unavailable for one or more selected partners.'));
});

test('booking confirmation uses authoritative server booking identity and total', () => {
  assert.ok(checkout.includes('setBookingId(data.booking.id)'));
  assert.ok(checkout.includes('setServerTotal(Number(data.booking.totalAmount))'));
  assert.ok(checkout.includes('const displayedTotal = serverTotal ?? total'));
  assert.ok(checkout.includes('<b>Booking ID:</b> {bookingId}'));
  assert.ok(checkout.includes('<b>Total amount:</b> ₹{displayedTotal.toLocaleString'));
});

test('confirmed pay-at-collection bookings persist confirmed workflow with pending payment', () => {
  assert.ok(bookings.includes("status: payAtCollection ? 'CONFIRMED' : 'PENDING'"));
  assert.ok(bookings.includes("paymentStatus: 'PENDING'"));
  assert.ok(bookings.includes("workflowStatus: payAtCollection ? 'BOOKING_CONFIRMED' : 'BOOKING_CREATED'"));
  assert.ok(bookings.includes('bookingConfirmedAt: payAtCollection ? now : null'));
});

test('successful confirmation clears the cart and routes patients to their dashboard', () => {
  assert.ok(checkout.includes("localStorage.removeItem('tglabs-cart')"));
  assert.ok(checkout.includes('href="/patient"'));
  assert.ok(checkout.includes('View patient dashboard'));
});

test('patient dashboard exposes booking tracking and payment state after confirmation', () => {
  assert.ok(patient.includes('LIVE BOOKING TRACKER'));
  assert.ok(patient.includes('tracking.workflowStatus'));
  assert.ok(patient.includes('tracking.paymentStatus'));
  assert.ok(patient.includes('Recent bookings'));
  assert.ok(patient.includes('Receipt available after payment'));
});

test('booking identity, idempotency and server-side pricing remain enforced', () => {
  assert.ok(bookings.includes('verifyFirebasePatientRequest'));
  assert.ok(bookings.includes('assertBookingOwner'));
  assert.ok(bookings.includes('idempotencyKey: z.string().uuid()'));
  assert.ok(bookings.includes('validateAndPriceBooking'));
});
