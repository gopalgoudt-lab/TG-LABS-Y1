import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const patient = read('../app/patient/page.tsx');
const reports = read('../app/api/patient/reports/route.ts');
const ai = read('../app/api/patient/reports/[id]/ai/route.ts');

test('patient report list is authenticated and scoped to the signed-in patient', () => {
  assert.ok(reports.includes('verifyFirebasePatientRequest'));
  assert.ok(reports.includes('const phone = identity.databasePhone'));
  assert.ok(reports.includes('where: { phone }'));
  assert.ok(patient.includes("fetch('/api/patient/reports', { headers, cache: 'no-store' })"));
});

test('AI explanation requires explicit patient consent and authenticated bearer access', () => {
  assert.ok(patient.includes('AI Report will use this diagnostic report for an educational explanation'));
  assert.ok(patient.includes('It is not a diagnosis or a substitute for your doctor.'));
  assert.ok(patient.includes("Authorization: `Bearer ${token}`"));
  assert.ok(ai.includes('verifyFirebasePatientRequest'));
  assert.ok(ai.includes('patient: { phone }'));
});

test('AI generation refuses missing reports and does not prescribe or diagnose', () => {
  assert.ok(ai.includes("if (!booking.reportData)"));
  assert.ok(ai.includes('Do not diagnose a disease or claim certainty.'));
  assert.ok(ai.includes('Do not prescribe, start, stop, or change medicines or supplements.'));
  assert.ok(ai.includes('Do not invent values, reference ranges, symptoms, history, or findings'));
});

test('AI prompt protects identifiers and preserves laboratory values', () => {
  assert.ok(ai.includes('Preserve every laboratory number, decimal, unit and reference range exactly as shown'));
  assert.ok(ai.includes('Never expose or repeat phone numbers, addresses, emails, IDs, payment information'));
  assert.ok(ai.includes('Clearly distinguish normal, borderline, and out-of-range results'));
});

test('suggested next tests remain bounded, clinically linked and non-directive', () => {
  assert.ok(ai.includes('Suggest no more than 5 next tests.'));
  assert.ok(ai.includes('clear clinical connection to a specific abnormal, borderline, or otherwise clinically relevant finding'));
  assert.ok(ai.includes('may be useful to discuss with your doctor'));
  assert.ok(ai.includes('Do not suggest broad screening panels, unrelated tests'));
});

test('AI output requires complete safety sections and multilingual support', () => {
  assert.ok(ai.includes('You MUST return all nine numbered sections.'));
  assert.ok(ai.includes('WHEN TO SEEK MEDICAL CARE'));
  assert.ok(ai.includes('IMPORTANT NOTE'));
  assert.ok(ai.includes("type Language = 'en' | 'te' | 'hi'"));
  assert.ok(patient.includes("const LANGUAGE_LABELS"));
});

test('generation is rate-limited, cached, non-stored and temporary files are deleted', () => {
  assert.ok(ai.includes('return count>=10'));
  assert.ok(ai.includes("store: false"));
  assert.ok(ai.includes("expires_after[seconds]"));
  assert.ok(ai.includes('deleteOpenAIFile'));
  assert.ok(ai.includes('cached: true'));
});

test('patient UI always displays the returned AI disclaimer', () => {
  assert.ok(patient.includes('<b>Important:</b> {aiReports[r.id].disclaimer}'));
  assert.ok(ai.includes('AI-generated educational explanation only.'));
});
