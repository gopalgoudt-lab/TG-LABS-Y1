import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const route=readFileSync(new URL('../app/api/admin/thyrocare/orders/route.ts',import.meta.url),'utf8');
test('manual order patient upsert and booking creation are atomic',()=>{const post=route.slice(route.indexOf('export async function POST'));assert.match(post,/\$transaction/);assert.match(post,/tx\.patient\.upsert/);assert.match(post,/tx\.booking\.create/);});
test('manual order remains explicitly Thyrocare scoped',()=>{assert.match(route,/createdByAdmin:'THYROCARE_MANUAL'/);assert.match(route,/brand:'THYROCARE'/);});
test('manual order retains billing guards',()=>{assert.match(route,/Discount cannot exceed total amount including home collection charges/);assert.match(route,/Paid amount cannot exceed net amount/);});
