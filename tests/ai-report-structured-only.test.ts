import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const ai=readFileSync(new URL('../app/api/patient/reports/[id]/ai/route.ts',import.meta.url),'utf8');

test('AI route never uploads the original report PDF',()=>{
  assert.equal(ai.includes('uploadPdfToOpenAI'),false);
  assert.equal(ai.includes('input_file'),false);
  assert.equal(ai.includes('/v1/files'),false);
});

test('AI route uses only trusted structured booking observations',()=>{
  assert.ok(ai.includes("source: { in: ['ADMIN_VERIFIED', 'AUTO_EXTRACTED'] }"));
  assert.ok(ai.includes('buildAiSafeReportPayload(verifiedObservations)'));
  assert.ok(ai.includes("patient: { phone }"));
  assert.ok(ai.includes('verifiedObservations.length'));
});

test('external AI request is text-only and non-persistent',()=>{
  assert.ok(ai.includes("type: 'input_text'"));
  assert.ok(ai.includes('store: false'));
});
