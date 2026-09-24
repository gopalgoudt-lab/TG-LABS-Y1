import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const route=readFileSync(new URL('../app/api/admin/thyrocare/orders/[id]/original-bill/route.ts',import.meta.url),'utf8');
test('original bill upload protects originalBills read-modify-write with transaction',()=>{const post=route.slice(route.indexOf('export async function POST'),route.indexOf('export async function DELETE'));assert.match(post,/\$transaction/);assert.match(post,/tx\.booking\.findFirst/);assert.match(post,/tx\.booking\.update/);});
test('original bill delete protects originalBills read-modify-write with transaction',()=>{const d=route.slice(route.indexOf('export async function DELETE'));assert.match(d,/\$transaction/);assert.match(d,/tx\.booking\.findFirst/);assert.match(d,/tx\.booking\.update/);});
test('bill mutations remain scoped to Thyrocare manual bookings',()=>{assert.match(route,/createdByAdmin:'THYROCARE_MANUAL'/);});
