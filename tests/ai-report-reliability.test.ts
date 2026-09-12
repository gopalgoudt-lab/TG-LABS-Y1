import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseAiReportResponse } from '../lib/ai-report-client';

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

test('AI report client accepts a valid JSON response', async () => {
  const response = new Response(JSON.stringify({
    analysis: 'Educational explanation',
    generatedAt: '2026-09-12T12:00:00.000Z',
    disclaimer: 'Educational use only',
    language: 'en',
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const parsed = await parseAiReportResponse(response);
  assert.equal(parsed.analysis, 'Educational explanation');
});

test('AI report client converts non-JSON gateway failures into a retryable patient message', async () => {
  const response = new Response('<html>Gateway Timeout</html>', {
    status: 504,
    headers: { 'content-type': 'text/html' },
  });

  await assert.rejects(() => parseAiReportResponse(response), /temporarily unavailable.*try again/i);
});

test('AI report client preserves safe API error messages', async () => {
  const response = new Response(JSON.stringify({ error: 'AI Report rate limit reached. Please try again later.' }), {
    status: 429,
    headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(() => parseAiReportResponse(response), /rate limit reached/i);
});

test('AI report client rejects malformed successful responses', async () => {
  const response = new Response('not-json', {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });

  await assert.rejects(() => parseAiReportResponse(response), /unexpected response/i);
});
