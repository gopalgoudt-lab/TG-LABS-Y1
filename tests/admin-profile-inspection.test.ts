import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('package editor lets admins inspect profile tests before adding a profile', () => {
  const page = fs.readFileSync('app/admin/catalog-editor/page.tsx', 'utf8');
  assert.match(page, /View included tests/);
  assert.match(page, /ProfileSearchTests/);
  assert.match(page, /Load tests/);
  assert.match(page, /Add profile/);
  assert.match(page, /includedTests/);
});
