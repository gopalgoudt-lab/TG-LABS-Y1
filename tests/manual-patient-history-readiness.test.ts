import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const bookings=readFileSync(new URL('../app/api/patient/bookings/route.ts',import.meta.url),'utf8');
const reports=readFileSync(new URL('../app/api/patient/reports/route.ts',import.meta.url),'utf8');
const helper=readFileSync(new URL('../lib/manual-patient-metadata.ts',import.meta.url),'utf8');
test('patient history maps Thyrocare manual test metadata',()=>{assert.match(bookings,/THYROCARE_MANUAL/);assert.match(bookings,/adminNotes/);assert.match(bookings,/manualPatientTests/);});
test('patient reports map Thyrocare manual test metadata',()=>{assert.match(reports,/THYROCARE_MANUAL/);assert.match(reports,/adminNotes/);assert.match(reports,/manualPatientTests/);});
test('manual metadata mapper fails closed and only accepts Thyrocare test arrays',()=>{assert.match(helper,/brand!=='THYROCARE'/);assert.match(helper,/Array\.isArray\(meta\.tests\)/);assert.match(helper,/catch\{return \[\]/);});
