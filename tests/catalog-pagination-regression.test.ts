import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const route = fs.readFileSync(path.join(process.cwd(), 'app/api/catalog/route.ts'), 'utf8');

test('catalog API applies cursor pagination in the database query instead of truncating before cursor', () => {
  assert.match(route, /cursor:/, 'catalog database queries must apply a Prisma cursor');
  assert.match(route, /skip:\s*query\.cursor\s*\?\s*1\s*:\s*0/, 'catalog database queries must skip the cursor row');
  assert.doesNotMatch(route, /products\.findIndex\(/, 'catalog must not search for a cursor only inside an already-truncated in-memory page');
});

test('partner and PACKAGE filters are applied before pagination', () => {
  assert.match(route, /slug:\s*query\.partner/, 'partner filter must remain in the database offer predicate');
  assert.match(route, /packageType:\s*query\.type/, 'PACKAGE or PROFILE filtering must remain in the database query');
});
