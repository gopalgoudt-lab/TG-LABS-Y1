import assert from 'node:assert/strict';import test from 'node:test';import { readFileSync } from 'node:fs';
const ai=readFileSync(new URL('../app/api/patient/reports/[id]/ai/route.ts',import.meta.url),'utf8');
const file=readFileSync(new URL('../app/api/patient/reports/[id]/file/route.ts',import.meta.url),'utf8');
const list=readFileSync(new URL('../app/api/patient/reports/route.ts',import.meta.url),'utf8');
test('patient report file lookup is ownership-scoped',()=>{assert.ok(file.includes('verifyFirebasePatientRequest(request)'));assert.ok(file.includes('where: { id, patient: { phone } }'));assert.ok(file.includes("if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 })"));});
test('patient AI report lookup is ownership-scoped',()=>{assert.ok(ai.includes('verifyFirebasePatientRequest(request)'));assert.ok(ai.includes('where: { id, patient: { phone } }'));assert.ok(ai.includes("if (!booking) return NextResponse.json({ error: 'Report not found.' }, { status: 404 })"));});
test('patient report listing is resolved from authenticated phone only',()=>{assert.ok(list.includes('verifyFirebasePatientRequest(request)'));assert.ok(list.includes('where: { phone }'));});
