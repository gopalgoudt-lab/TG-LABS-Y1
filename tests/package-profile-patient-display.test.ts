import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('patient package details expose expandable included profiles without double counting', () => {
  const data = fs.readFileSync('lib/catalog-data.ts', 'utf8');
  const dto = fs.readFileSync('lib/catalog-public-dto.ts', 'utf8');
  const detail = fs.readFileSync('components/catalog/CatalogDetail.tsx', 'utf8');

  assert.match(data, /includedProfiles:/);
  assert.match(data, /parameterCount:true,tests:/);
  assert.match(dto, /includedProfiles:\(v\.includedProfiles\?\?\[\]\)\.map/);
  assert.match(detail, /Included profiles/);
  assert.match(detail, /parameters across/);
  assert.match(detail, /<details key=\{profile\.id\}>/);
  assert.match(detail, /not double-counted/);
  assert.match(detail, /\/tests\/\$\{test\.slug\}/);
});
