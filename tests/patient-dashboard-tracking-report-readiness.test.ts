import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const patient = read('../app/patient/page.tsx');
const bookings = read('../app/api/patient/bookings/route.ts');
const reportFile = read('../app/api/patient/reports/[id]/file/route.ts');
const receipt = read('../app/api/patient/bookings/[id]/receipt/route.ts');

test('patient dashboard requires Firebase identity and handles expired auth', () => {
  assert.ok(patient.includes("router.replace('/auth')"));
  assert.ok(patient.includes("Authorization: `Bearer ${token}`"));
  assert.ok(bookings.includes('verifyFirebasePatientRequest'));
  assert.ok(bookings.includes('where: { phone }'));
});

test('booking tracker exposes the launch workflow and timeline', () => {
  for (const state of ['BOOKING_CREATED','BOOKING_CONFIRMED','TECHNICIAN_ASSIGNED','TECHNICIAN_ACCEPTED','ON_THE_WAY','REACHED_PATIENT','SAMPLE_COLLECTED','SAMPLE_RECEIVED_AT_LAB','PROCESSING','REPORT_READY','REPORT_DELIVERED']) {
    assert.ok(patient.includes(state));
    assert.ok(bookings.includes(state));
  }
  assert.ok(patient.includes('LIVE BOOKING TRACKER'));
});

test('patient booking cards remain mobile-friendly and show payment state', () => {
  assert.ok(patient.includes("flexWrap: 'wrap'"));
  assert.ok(patient.includes("gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))'"));
  assert.ok(patient.includes("gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))'"));
  assert.ok(patient.includes("Receipt available after payment"));
});

test('report access is authenticated, patient-owned and served as private PDF', () => {
  assert.ok(reportFile.includes('verifyFirebasePatientRequest'));
  assert.ok(reportFile.includes('patient: { phone }'));
  assert.ok(reportFile.includes("'Content-Type': 'application/pdf'"));
  assert.ok(reportFile.includes("'Cache-Control': 'private, no-store, max-age=0'"));
  assert.ok(reportFile.includes("'X-Robots-Tag': 'noindex, nofollow, noarchive'"));
  assert.ok(reportFile.includes('hasPdfSignature'));
});

test('patient UI retrieves report files with bearer auth and safe fallback download', () => {
  assert.ok(patient.includes('/file'));
  assert.ok(patient.includes("headers: { Authorization: `Bearer ${token}` }"));
  assert.ok(patient.includes("window.open(url, '_blank')"));
  assert.ok(patient.includes("a.download = report.name || 'diagnostic-report.pdf'"));
});

test('payment receipts are patient-owned and unavailable before PAID status', () => {
  assert.ok(receipt.includes('verifyFirebasePatientRequest'));
  assert.ok(receipt.includes('patient: { phone: identity.databasePhone }'));
  assert.ok(receipt.includes('isReceiptAvailable(booking.paymentStatus)'));
  assert.ok(receipt.includes('Payment receipt is available after payment is marked PAID.'));
  assert.ok(receipt.includes("'Cache-Control': 'private, no-store'"));
});
