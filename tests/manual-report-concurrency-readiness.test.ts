import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const route=readFileSync(new URL('../app/api/admin/thyrocare/orders/[id]/report/route.ts',import.meta.url),'utf8');
test('manual report upload protects reportDocuments read-modify-write with transaction',()=>{assert.match(route,/\$transaction/);assert.match(route,/tx\.booking\.findFirst/);assert.match(route,/tx\.booking\.update/);});
test('manual report delete protects reportDocuments read-modify-write with transaction',()=>{const deletePart=route.slice(route.indexOf('export async function DELETE'));assert.match(deletePart,/\$transaction/);assert.match(deletePart,/tx\.booking\.findFirst/);assert.match(deletePart,/tx\.booking\.update/);});
test('report operations remain scoped to Thyrocare manual bookings',()=>{assert.match(route,/createdByAdmin:'THYROCARE_MANUAL'/);});
