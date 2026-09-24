import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bookings=readFileSync(new URL('../app/api/patient/bookings/route.ts',import.meta.url),'utf8');
const reports=readFileSync(new URL('../app/api/patient/reports/route.ts',import.meta.url),'utf8');

test('patient booking history recognizes manual Thyrocare bookings',()=>{
 assert.match(bookings,/THYROCARE_MANUAL/);
 assert.match(bookings,/adminNotes/);
});

test('patient report listing recognizes manual Thyrocare bookings',()=>{
 assert.match(reports,/THYROCARE_MANUAL/);
 assert.match(reports,/adminNotes/);
});
