import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('admin catalog search provides live selectable autocomplete results', () => {
  const page = fs.readFileSync('app/admin/catalog-editor/page.tsx', 'utf8');
  assert.match(page, /loadCatalogSuggestions/);
  assert.match(page, /changeCatalogQuery/);
  assert.match(page, /setTimeout\(\(\) => void loadCatalogSuggestions\(value\), 250\)/);
  assert.match(page, /role="combobox"/);
  assert.match(page, /role="listbox"/);
  assert.match(page, /role="option"/);
  assert.match(page, /selectCatalogItem\(item\)/);
  assert.match(page, /partner=\$\{encodeURIComponent\(form\.partner\)\}/);
  assert.match(page, /packageType=\$\{editorMode\}/);
});
