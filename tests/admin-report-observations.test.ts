import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const route=readFileSync(new URL('../app/api/admin/bookings/[id]/report-observations/route.ts',import.meta.url),'utf8');
const editor=readFileSync(new URL('../components/admin/ReportObservationsEditor.tsx',import.meta.url),'utf8');

test('structured report API requires server-side admin session',()=>{
 assert.ok(route.includes('adminFromRequest(request)'));
 assert.ok(route.includes('adminAuthError(error)'));
});
test('structured report API allow-lists fields and audits writes',()=>{
 for(const field of ['parameterName','value','unit','referenceRange','flag']) assert.ok(route.includes(field));
 assert.ok(route.includes("source: 'ADMIN_VERIFIED'"));
 assert.ok(route.includes("action: 'REPORT_OBSERVATIONS_REPLACED'"));
 assert.ok(route.includes('z.array(observation).max(250)'));
});
test('admin editor warns against identity data and uses booking-scoped endpoint',()=>{
 assert.ok(editor.includes('Do not enter patient name, phone, email, address, IDs'));
 assert.ok(editor.includes('/report-observations'));
});
