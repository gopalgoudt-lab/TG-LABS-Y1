import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('components/catalog/PatientCatalogSearch.tsx', 'utf8');

test('patient autocomplete fetches a dedicated test result set', () => {
  assert.match(source, /type=TEST&limit=8/);
  assert.match(source, /Promise\.all\(\[/);
});

test('patient autocomplete ranks strong name matches and prefers profiles on equal relevance', () => {
  assert.match(source, /name\.startsWith\(q\)/);
  assert.match(source, /words\.includes\(q\)/);
  assert.match(source, /item\.type === 'PROFILE' \? 0/);
  assert.match(source, /rankSuggestions\(combined, value\)\.slice\(0, 8\)/);
});

test('patient autocomplete de-duplicates combined catalog results', () => {
  assert.match(source, /candidate\.type === item\.type && candidate\.slug === item\.slug/);
});
