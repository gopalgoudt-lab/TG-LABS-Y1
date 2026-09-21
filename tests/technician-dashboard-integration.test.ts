import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/technician/page.tsx', 'utf8');
const layout = fs.readFileSync('app/technician/layout.tsx', 'utf8');

test('technician dashboard remains inside technician DashboardChrome', () => {
  assert.match(layout, /DashboardChrome role="technician"/);
  assert.match(layout, /TechnicianPinShortcut/);
  assert.match(page, /\/api\/technician\/jobs/);
  assert.match(page, /router\.replace\('\/technician\/login'\)/);
});

test('technician operational workflow remains intact', () => {
  assert.match(page, /\/workflow/);
  assert.match(page, /method:'PATCH'/);
  assert.match(page, /TECHNICIAN_ACCEPTED/);
  assert.match(page, /SAMPLE_COLLECTED/);
  assert.match(page, /SAMPLE_RECEIVED_AT_LAB/);
  assert.match(page, /technicianNotes/);
});

test('technician GPS and patient contact actions remain intact', () => {
  assert.match(page, /navigator\.geolocation\.watchPosition/);
  assert.match(page, /\/location/);
  assert.match(page, /tel:\$\{job\.patient\.phone\}/);
  assert.match(page, /wa\.me/);
  assert.match(page, /google\.com\/maps/);
});

test('technician collection requirements remain visible', () => {
  assert.match(page, /PRINTED REPORT REQUIRED/);
  assert.match(page, /Sample Type/);
  assert.match(page, /Fasting:/);
  assert.match(page, /Payment/);
});

test('technician page no longer duplicates dashboard shell header or KPI cards', () => {
  assert.doesNotMatch(page, /TG LABS • TECHNICIAN PORTAL/);
  assert.doesNotMatch(page, /My Collection Jobs/);
  assert.match(page, /className="technicianPortalContent"/);
});
