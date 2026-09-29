import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const route=fs.readFileSync('app/api/health/route.ts','utf8');
test('public health response is minimal and non-cacheable',()=>{assert.match(route,/status: 'ok'/);assert.match(route,/status: 'degraded'/);assert.match(route,/'Cache-Control': 'no-store'/);assert.doesNotMatch(route,/service:/);assert.doesNotMatch(route,/version:/);assert.doesNotMatch(route,/database,/);assert.doesNotMatch(route,/timestamp:/);});
test('health check still verifies database reachability',()=>{assert.match(route,/prisma\.\$queryRaw/);assert.match(route,/SELECT 1/);assert.match(route,/status: 503/);});
