import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/admin/catalog-editor/page.tsx', 'utf8');
const patch = fs.readFileSync('app/api/admin/catalog-editor/[kind]/[id]/route.ts', 'utf8');
const search = fs.readFileSync('app/api/admin/catalog-editor/search/route.ts', 'utf8');

test('admin editor exposes an active/inactive service status for tests, profiles and packages', () => {
  assert.match(page, /Service status/i);
  assert.match(page, /Active/);
  assert.match(page, /Inactive/);
  assert.match(page, /active:\s*form\.active/);
});

test('admin search returns current active status for test and package/profile records', () => {
  assert.match(search, /active:\s*test\.active/);
  assert.match(search, /active:\s*catalogPackage\.active/);
});

test('catalog PATCH explicitly accepts the existing item active field and audits it', () => {
  assert.match(patch, /active:\s*z\.boolean\(\)\.optional\(\)/);
  assert.match(patch, /changedFields/);
  assert.match(patch, /adminAuditLog\.create/);
});

test('item status control does not mutate partner activation or serviceability controls', () => {
  assert.doesNotMatch(patch, /bookingEnabled\s*:/);
  assert.doesNotMatch(patch, /operationalEnabled\s*:/);
  assert.doesNotMatch(patch, /displayEnabled\s*:/);
  assert.doesNotMatch(patch, /partnerServiceability|PartnerServiceability/);
});
