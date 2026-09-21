import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/patient/page.tsx', 'utf8');
const layout = fs.readFileSync('app/patient/layout.tsx', 'utf8');

test('patient dashboard remains inside authenticated DashboardChrome', () => {
  assert.match(layout, /DashboardChrome role="patient"/);
  assert.match(page, /onAuthStateChanged/);
  assert.match(page, /signOut\(auth\)/);
  assert.match(page, /router\.replace\('\/auth'\)/);
});

test('patient dashboard preserves live booking and report APIs', () => {
  assert.match(page, /\/api\/patient\/bookings/);
  assert.match(page, /\/api\/patient\/reports/);
  assert.match(page, /\/receipt/);
  assert.match(page, /\/file/);
  assert.match(page, /\/ai/);
});

test('patient dashboard preserves operational tracker and AI report features', () => {
  assert.match(page, /LIVE BOOKING TRACKER/);
  assert.match(page, /Download payment receipt/);
  assert.match(page, /View \/ Download report/);
  assert.match(page, /AI Health Report/);
  assert.match(page, /AiReportView/);
});

test('patient page no longer duplicates dashboard shell header or stats', () => {
  assert.doesNotMatch(page, /TG LABS PATIENT PORTAL/);
  assert.doesNotMatch(page, /function Stat\(/);
  assert.match(page, /className="patientPortalContent"/);
});
