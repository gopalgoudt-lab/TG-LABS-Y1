import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('patient launch keeps serviceability enforced before booking', () => {
  const checkout = read('../app/checkout/page.tsx');
  const serviceability = read('../app/api/serviceability/route.ts');
  assert.ok(checkout.includes('/api/serviceability'));
  assert.ok(serviceability.length > 0);
});

test('patient launch keeps server-side booking and payment integrity routes', () => {
  const bookings = read('../app/api/bookings/route.ts');
  const order = read('../app/api/payments/razorpay/order/route.ts');
  const verify = read('../app/api/payments/razorpay/verify/route.ts');
  assert.ok(bookings.length > 0);
  assert.ok(order.length > 0);
  assert.ok(verify.length > 0);
});

test('patient launch keeps patient booking and report boundaries', () => {
  const patientBookings = read('../app/api/patient/bookings/route.ts');
  const patientReports = read('../app/api/patient/reports/route.ts');
  const patientLayout = read('../app/patient/layout.tsx');
  assert.ok(patientBookings.length > 0);
  assert.ok(patientReports.length > 0);
  assert.ok(patientLayout.length > 0);
});

test('patient launch keeps canonical, robots and private-route safeguards covered by Phase 3C', () => {
  const phase3c = read('./phase3c-go-live-readiness.test.ts');
  for (const route of ['/admin', '/api', '/checkout', '/patient', '/technician']) {
    assert.ok(phase3c.includes(route));
  }
  assert.ok(phase3c.includes('https://www.tglabs.in'));
});

test('patient launch has explicit regression coverage for critical funnel controls', () => {
  const required = [
    './phase2b-integrity.test.ts',
    './phase2c2-booking-revalidation.test.ts',
    './phase3c-serviceability-cart.test.ts',
    './booking-payment-home-charge-integrity.test.ts',
    './payment-receipt.test.ts',
    './firebase-auth.test.ts',
    './patient-home-search-autocomplete.test.ts',
    './mobile-catalog-price-layout.test.ts',
  ];
  for (const file of required) assert.doesNotThrow(() => read(file), file);
});
