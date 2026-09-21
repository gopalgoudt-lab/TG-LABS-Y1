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


test('Search catalog selects an unambiguous result', () => {
  const page = fs.readFileSync('app/admin/catalog-editor/page.tsx', 'utf8');
  assert.match(page, /loadCatalogSuggestions\(query, true\)/);
  assert.match(page, /selectSingle && items\.length === 1/);
  assert.match(page, /selectCatalogItem\(items\[0\]\)/);
});

test('admin test search stays partner scoped and supports name alias and catalog code', () => {
  const searchApi = fs.readFileSync('app/api/admin/catalog-editor/search/route.ts', 'utf8');
  assert.match(searchApi, /partnerId: diagnosticPartner\.id/);
  assert.match(searchApi, /name: \{ contains: q, mode: 'insensitive' \}/);
  assert.match(searchApi, /aliases: \{ has: q \}/);
  assert.match(searchApi, /catalogCode: \{ contains: q, mode: 'insensitive' \}/);
});
