import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const checkout = readFileSync(new URL('../app/checkout/page.tsx', import.meta.url), 'utf8');

test('checkout layout can shrink safely on narrow mobile viewports', () => {
  assert.ok(checkout.includes('.checkoutLayout{'));
  assert.ok(checkout.includes('grid-template-columns:minmax(0,1.55fr) minmax(300px,.75fr)'));
  assert.ok(checkout.includes('@media(max-width:850px){.checkoutLayout{grid-template-columns:1fr}'));
  assert.ok(checkout.includes('@media(max-width:560px){.modeGrid,.twoFields{grid-template-columns:1fr}'));
});

test('checkout controls use mobile-safe full-width fields and responsive actions', () => {
  assert.ok(checkout.includes('.field{width:100%;box-sizing:border-box}'));
  assert.ok(checkout.includes('.successActions .btn{width:100%;text-align:center}'));
  assert.ok(checkout.includes('inputMode="numeric"'));
});

test('checkout keeps authoritative booking safeguards while hardening mobile UX', () => {
  assert.ok(checkout.includes("fetch('/api/bookings'"));
  assert.ok(checkout.includes('idempotencyKey: requestKey'));
  assert.ok(checkout.includes("Authorization: `Bearer ${await user.getIdToken()}`"));
  assert.ok(checkout.includes("paymentOption: 'COLLECTION'"));
  assert.ok(checkout.includes('setServerTotal(Number(data.booking.totalAmount))'));
  assert.ok(checkout.includes("localStorage.removeItem('tglabs-cart')"));
});

test('checkout prevents duplicate package-contained test charging', () => {
  assert.ok(checkout.includes("if (item.kind === 'test' && packageTestIds.has(item.id)) return sum"));
  assert.ok(checkout.includes('Tests already included in a selected package are not charged twice.'));
});
