import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('patient homepage search offers live selectable public catalog suggestions', () => {
  const page = fs.readFileSync('app/page.tsx', 'utf8');
  const search = fs.readFileSync('components/catalog/PatientCatalogSearch.tsx', 'utf8');
  assert.match(page, /<PatientCatalogSearch\/>/);
  assert.match(search, /\/api\/catalog\?search=/);
  assert.match(search, /limit=8/);
  assert.match(search, /250/);
  assert.match(search, /role="combobox"/);
  assert.match(search, /role="listbox"/);
  assert.match(search, /role="option"/);
  assert.match(search, /item\.type === 'TEST'/);
  assert.match(search, /offer\.partner\.name/);
  assert.match(search, /offer\.price/);
  assert.match(search, /router\.push\(detailsHref\(item\)\)/);
  assert.match(search, /router\.push\(\`\/\?q=/);
});
