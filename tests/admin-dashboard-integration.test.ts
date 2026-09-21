import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/admin/page.tsx', 'utf8');
const layout = fs.readFileSync('app/admin/layout.tsx', 'utf8');

test('admin portal remains inside admin DashboardChrome', () => {
  assert.match(layout, /DashboardChrome role="admin"/);
  assert.match(page, /className="adminPortalContent"/);
});

test('admin live data and booking operations remain intact', () => {
  assert.match(page, /\/api\/admin\/bookings/);
  assert.match(page, /Manual Booking/);
  assert.match(page, /method,headers/);
  assert.match(page, /'POST'/);
  assert.match(page, /Booking management/);
  assert.match(page, /Latest bookings/);
});

test('admin catalog management remains intact', () => {
  assert.match(page, /\/api\/admin\/catalog\/tests/);
  assert.match(page, /\/api\/admin\/catalog\/packages/);
  assert.match(page, /'PATCH'/);
  assert.match(page, /'DELETE'/);
  assert.match(page, /Catalog Search/);
  assert.match(page, /Add Diagnostic Test/);
  assert.match(page, /Add Health Package/);
});

test('admin operational tabs remain available', () => {
  for (const label of ['Overview','Bookings','Catalog','Add Test','Add Package','Manual Booking']) {
    assert.match(page, new RegExp(label));
  }
});

test('admin page no longer duplicates dashboard shell header or KPI strip', () => {
  assert.doesNotMatch(page, /TG LABS • PHASE 1/);
  assert.doesNotMatch(page, /Admin Command Centre/);
  assert.doesNotMatch(page, /function Kpi/);
});
