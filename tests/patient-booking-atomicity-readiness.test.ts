import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../app/api/bookings/route.ts', import.meta.url), 'utf8');

test('patient upsert and booking creation are atomic', () => {
  assert.ok(route.includes('prisma.$transaction'));
  assert.ok(route.includes('tx.patient.upsert'));
  assert.ok(route.includes('tx.booking.create'));
});

test('booking atomicity uses Serializable isolation', () => {
  assert.ok(route.includes("isolationLevel: 'Serializable'"));
});
