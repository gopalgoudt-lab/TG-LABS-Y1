import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Aarogyam 1.3 with UTSH uses verified report mappings and Vitamin Profile label', () => {
 const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
 assert.match(detail, /thyrocare-package-aa1-3wu-3/);
 assert.match(detail, /aarogyamCampPackageIds\.has\(product\.id\)/);
 assert.match(detail, /productId==='thyrocare-package-aa1-3wu-3'/);
 assert.match(detail, /return 'VITAMIN PROFILE'/);
});
