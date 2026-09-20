import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Aarogyam Camp Profile 2 uses the shared report-parameter map', () => {
  const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
  assert.match(detail, /thyrocare-package-aacp2-34/);
  assert.match(detail, /thyrocare-profile-cardiac-risk-aacp2':\['ApoB \/ ApoA1 Ratio'\]/);
  assert.match(detail, /aarogyamCampPackageIds\.has\(product\.id\)/);
  assert.match(detail, /calculatedBadge/);
});
