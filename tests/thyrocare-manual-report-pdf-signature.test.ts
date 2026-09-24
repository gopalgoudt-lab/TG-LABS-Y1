import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route=readFileSync(new URL('../app/api/admin/thyrocare/orders/[id]/report/route.ts',import.meta.url),'utf8');

test('manual Thyrocare report upload validates decoded PDF signature before persistence',()=>{
 assert.match(route,/%PDF-/);
 assert.match(route,/Buffer\.from\([^\n]*base64/);
});

test('manual Thyrocare report upload retains existing PDF-only and size safeguards',()=>{
 assert.match(route,/endsWith\('\.pdf'\)/);
 assert.match(route,/data:application\\\/pdf;base64/);
 assert.match(route,/MAX=3\*1024\*1024/);
});

test('manual Thyrocare report responses remain private and audited',()=>{
 assert.match(route,/Cache-Control.*private, no-store/);
 assert.match(route,/THYROCARE_REPORT_UPLOADED/);
 assert.match(route,/THYROCARE_REPORT_DELETED/);
});
