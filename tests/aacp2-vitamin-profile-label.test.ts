import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('AACP2 labels the reused vitamin combo as Vitamin Profile only on that package', () => {
 const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
 assert.match(detail, /productId==='thyrocare-package-aacp2-34'&&profile\.id==='thyrocare-profile-vdtab12c-87'/);
 assert.match(detail, /return 'VITAMIN PROFILE'/);
 assert.match(detail, /return profile\.name/);
 assert.match(detail, /includedProfileDisplayName\(product\.id,profile\)/);
});
