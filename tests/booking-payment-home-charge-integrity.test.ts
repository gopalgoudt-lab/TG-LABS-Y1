import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('admin booking edits preserve home collection charge in authoritative total', () => {
  const route=readFileSync(new URL('../app/api/admin/bookings/[id]/route.ts',import.meta.url),'utf8');
  assert.ok(route.includes("diagnosticAmount+(existing.homeCollectionCharge||0)+(existing.printedReportFee||0)"));
});

test('collection payment is recorded atomically with payment transaction and audit', () => {
  const route=readFileSync(new URL('../app/api/admin/bookings/[id]/payment/route.ts',import.meta.url),'utf8');
  assert.ok(route.includes("paymentStatus:'PAID'"));
  assert.ok(route.includes("paidAt:now"));
  assert.ok(route.includes("tx.paymentTransaction.create"));
  assert.ok(route.includes("amount:existing.totalAmount"));
  assert.ok(route.includes("tx.adminAuditLog.create"));
  assert.ok(route.includes("BOOKING_PAYMENT_RECORDED"));
  assert.ok(route.includes("if(existing.paymentStatus==='PAID')"));
});

test('admin UI cannot fake payment status through ordinary booking save', () => {
  const page=readFileSync(new URL('../app/admin/bookings/[id]/page.tsx',import.meta.url),'utf8');
  assert.ok(page.includes('Payment Status<input'));
  assert.ok(page.includes('readOnly'));
  assert.ok(page.includes('Record full payment'));
  assert.ok(page.includes('/payment'));
  assert.ok(!page.includes("onChange={e => set('paymentStatus', e.target.value)}"));
});
