import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pagePath = 'app/admin/catalog-editor/page.tsx';
const apiPath = 'app/api/admin/catalog-editor/[kind]/[id]/route.ts';

test('admin catalog editor exposes test and package metadata/pricing controls', () => {
  assert.equal(fs.existsSync(pagePath), true, 'admin catalog editor page must exist');
  const page = fs.readFileSync(pagePath, 'utf8');
  for (const required of ['Tests', 'Packages', 'MRP', 'Selling price', 'Description', 'Sample type', 'Preparation', 'TAT', 'Gross margin']) {
    assert.match(page, new RegExp(required, 'i'), `page must include ${required}`);
  }
});

test('admin catalog editor provides interactive search, selection and save workflow', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  for (const required of ['Search catalog', 'Partner', 'Test', 'Package', 'Save changes', 'Success', 'Error']) {
    assert.match(page, new RegExp(required, 'i'), `interactive editor must include ${required}`);
  }
  assert.match(page, /fetch\s*\(/, 'interactive editor must load/save catalog data');
  assert.match(page, /PATCH/, 'interactive editor must save through PATCH');
});

test('catalog editor API preserves activation and serviceability safety boundary', () => {
  assert.equal(fs.existsSync(apiPath), true, 'catalog editor PATCH API must exist');
  const api = fs.readFileSync(apiPath, 'utf8');
  assert.match(api, /AdminAuditLog|adminAuditLog/, 'writes must be audited');
  assert.doesNotMatch(api, /bookingEnabled\s*:/, 'must not update booking activation');
  assert.doesNotMatch(api, /operationalEnabled\s*:/, 'must not update operations activation');
  assert.doesNotMatch(api, /displayEnabled\s*:/, 'must not update display activation');
  assert.doesNotMatch(api, /PartnerServiceability|partnerServiceability/, 'must not update serviceability');
});
