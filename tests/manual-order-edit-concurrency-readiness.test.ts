import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const route=readFileSync(new URL('../app/api/admin/thyrocare/orders/manage/route.ts',import.meta.url),'utf8');
test('manual order edit protects metadata read-modify-write transactionally',()=>{const patch=route.slice(route.indexOf('export async function PATCH'),route.indexOf('export async function DELETE'));assert.match(patch,/\$transaction/);assert.match(patch,/tx\.booking\.findFirst/);assert.match(patch,/tx\.booking\.update/);assert.match(patch,/isolationLevel:'Serializable'/);});
test('manual order edit remains Thyrocare scoped and audited',()=>{assert.match(route,/createdByAdmin:'THYROCARE_MANUAL'/);assert.match(route,/THYROCARE_MANUAL_ORDER_UPDATED/);});
