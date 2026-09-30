import assert from 'node:assert/strict';import test from 'node:test';import { readFileSync } from 'node:fs';
const receipt=readFileSync(new URL('../app/api/patient/bookings/[id]/receipt/route.ts',import.meta.url),'utf8');
const bookings=readFileSync(new URL('../app/api/patient/bookings/route.ts',import.meta.url),'utf8');
const verify=readFileSync(new URL('../app/api/payments/razorpay/verify/route.ts',import.meta.url),'utf8');
test('patient receipt lookup is ownership-scoped',()=>{assert.ok(receipt.includes('verifyFirebasePatientRequest(request)'));assert.ok(receipt.includes('where: { id, patient: { phone: identity.databasePhone } }'));assert.ok(receipt.includes("if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })"));});
test('patient booking list is scoped to authenticated phone',()=>{assert.ok(bookings.includes('verifyFirebasePatientRequest(request)'));assert.ok(bookings.includes('where: { phone }'));});
test('payment verification requires booking ownership and server-side payment checks',()=>{assert.ok(verify.includes('verifyFirebasePatientRequest(request)'));assert.ok(verify.includes('assertBookingOwner(booking.patient.phone, identity.databasePhone)'));assert.ok(verify.includes('verifyRazorpayPaymentSignature('));assert.ok(verify.includes('assertCapturedPayment(payment, booking.razorpayOrderId, expectedAmount)'));});
