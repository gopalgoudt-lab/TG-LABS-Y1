import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pagePath = 'app/admin/catalog-editor/page.tsx';

test('admin catalog editor uses canonical partner slugs instead of free-text partner input', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /<select[^>]*value=\{form\.partner\}/, 'Partner control must be a selector');
  assert.match(page, /value="sagepath-labs"/, 'Partner selector must send Sagepath canonical slug');
  assert.match(page, /Sagepath Labs/, 'Partner selector must display Sagepath Labs');
  assert.match(page, /value="thyrocare"/, 'Partner selector must include Thyrocare canonical slug');
  assert.doesNotMatch(page, /<label>Partner<input/, 'Partner must not remain a free-text input');
});
