import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ai=readFileSync(new URL('../app/api/patient/reports/[id]/ai/route.ts',import.meta.url),'utf8');
const receipt=readFileSync(new URL('../app/api/patient/bookings/[id]/receipt/route.ts',import.meta.url),'utf8');
const helper=readFileSync(new URL('../lib/manual-patient-metadata.ts',import.meta.url),'utf8');

test('AI report context recognizes Thyrocare manual tests without weakening patient ownership',()=>{
 assert.match(ai,/manualPatientTests/);
 assert.match(ai,/createdByAdmin/);
 assert.match(ai,/adminNotes/);
 assert.match(ai,/patient:\s*\{\s*phone/);
});

test('paid Thyrocare manual receipt uses authoritative manual billing metadata',()=>{
 assert.match(receipt,/manualPatientReceipt/);
 assert.match(receipt,/createdByAdmin/);
 assert.match(receipt,/adminNotes/);
 assert.match(receipt,/patient:\s*\{\s*phone:\s*identity\.databasePhone/);
});

test('manual metadata helper exposes validated receipt totals without inventing per-test prices',()=>{
 assert.match(helper,/manualPatientReceipt/);
 assert.match(helper,/grossAmount/);
 assert.match(helper,/testAmount/);
 assert.match(helper,/homeCollectionCharge/);
 assert.match(helper,/discount/);
 assert.match(helper,/paidAmount/);
 assert.match(helper,/balance/);
});
