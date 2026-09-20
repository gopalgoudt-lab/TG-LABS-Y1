import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Aarogyam 1.4 with UTSH uses verified report mappings and brochure profile labels', () => {
 const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
 assert.match(detail, /thyrocare-package-aa1-4wu-4/);
 assert.match(detail, /aarogyamCampPackageIds\.has\(product\.id\)/);
 assert.match(detail, /return 'VITAMIN PROFILE'/);
 assert.match(detail, /return 'ELECTROLYTES PROFILE'/);
});
