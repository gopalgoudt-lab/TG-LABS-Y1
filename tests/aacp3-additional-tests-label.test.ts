import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('mixed package test section is labelled as additional individual tests', () => {
 const detail=fs.readFileSync('components/catalog/CatalogDetail.tsx','utf8');
 assert.match(detail, /'Additional individual tests'/);
 assert.match(detail, /\`\$\{includedTestCount\} individual tests\`/);
 assert.match(detail, /These tests are included in addition to the profile groups above\./);
});
