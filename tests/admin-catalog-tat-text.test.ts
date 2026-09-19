import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pagePath = 'app/admin/catalog-editor/page.tsx';

test('admin catalog editor preserves partner TAT as descriptive text', () => {
  const page = fs.readFileSync(pagePath, 'utf8');
  assert.match(page, /tat:\s*string/, 'editor form must model TAT as text');
  assert.match(page, /<label>TAT<input(?![^>]*type="number")/, 'TAT control must accept descriptive partner TAT values');
  assert.match(page, /tat:\s*form\.tat/, 'save payload must preserve TAT text');
  assert.doesNotMatch(page, /Number\(form\.tat/, 'TAT must not be coerced to a number');
});
