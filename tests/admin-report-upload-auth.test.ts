import assert from 'node:assert/strict';import test from 'node:test';import { readFileSync } from 'node:fs';
const route=readFileSync(new URL('../app/api/admin/reports/route.ts',import.meta.url),'utf8');
test('diagnostic report publishing requires signed admin session',()=>{assert.ok(route.includes('adminFromRequest(request)'));assert.ok(route.includes('adminAuthError(error)'));});
test('authorization occurs before request body and report mutation',()=>{const auth=route.indexOf('adminFromRequest(request)');const parse=route.indexOf('uploadSchema.parse(await request.json())');const update=route.indexOf('prisma.booking.update');assert.ok(auth>0&&parse>auth&&update>parse);});
