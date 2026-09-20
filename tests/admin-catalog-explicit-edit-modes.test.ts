import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/admin/catalog-editor/page.tsx', 'utf8');

test('catalog editor exposes Test, Profile and Package edit modes', () => {
  assert.match(page, /type EditorMode = 'TEST' \| 'PROFILE' \| 'PACKAGE'/);
  assert.match(page, /<option value="TEST">Test<\/option>/);
  assert.match(page, /<option value="PROFILE">Profile<\/option>/);
  assert.match(page, /<option value="PACKAGE">Package<\/option>/);
});

test('profile/package searches preserve packageType filtering', () => {
  assert.match(page, /packageType=\$\{editorMode\}/);
  assert.match(page, /mode === 'TEST' \? 'test' : 'package'/);
});

test('package-only included profiles remain protected from profile editor', () => {
  assert.match(page, /form\.packageType === 'PACKAGE'/);
  assert.match(page, /includedProfileIds: selectedProfiles\.map/);
});
