import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/patient/reports/[id]/ai/route.ts', 'utf8');
const patient = fs.readFileSync('app/patient/page.tsx', 'utf8');

test('AI report route allows longer multilingual generation time', () => {
  assert.match(route, /export const maxDuration = 180;/);
});

test('AI report route preserves authentication, ownership, rate limiting and cleanup', () => {
  assert.match(route, /verifyFirebasePatientRequest/);
  assert.match(route, /patient: \{ phone \}/);
  assert.match(route, /aiGenerationLimited\(phone\)/);
  assert.match(route, /deleteOpenAIFile/);
  assert.match(route, /store: false/);
});

test('patient AI report request remains isolated to the authenticated report endpoint', () => {
  assert.match(patient, /\/api\/patient\/reports\/\$\{report\.id\}\/ai/);
  assert.match(patient, /Authorization: `Bearer \$\{token\}`/);
});
