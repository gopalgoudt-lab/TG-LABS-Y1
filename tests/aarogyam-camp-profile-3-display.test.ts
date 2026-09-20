import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Aarogyam Camp Profile 3 renders mixed profile and individual-test composition', () => {
 const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
 assert.match(detail, /thyrocare-package-acp3-35/);
 assert.match(detail, /thyrocare-profile-ironpro-47':\['% Transferrin Saturation','Unsat\. Iron-binding Capacity \(UIBC\)'\]/);
 assert.match(detail, /individual tests/);
 assert.match(detail, /individually listed tests in addition to the profile groups above/);
});
