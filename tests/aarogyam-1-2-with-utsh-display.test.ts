import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Aarogyam 1.2 with UTSH uses verified report-parameter mappings', () => {
 const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
 assert.match(detail, /thyrocare-package-aa1-2wu-2/);
 assert.match(detail, /aarogyamCampPackageIds\.has\(product\.id\)/);
 assert.match(detail, /thyrocare-profile-ironpro-47/);
 assert.match(detail, /thyrocare-profile-cardiac-risk-aacp2/);
});
