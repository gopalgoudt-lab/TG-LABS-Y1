import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const route=readFileSync(new URL('../app/api/admin/thyrocare/orders/[id]/payment/route.ts',import.meta.url),'utf8');
test('manual payment update is guarded by a database transaction',()=>{assert.match(route,/\$transaction/);assert.match(route,/isolationLevel:'Serializable'/);});
test('manual payment update re-reads the order inside the transaction',()=>{assert.match(route,/tx\.booking\.findFirst/);assert.match(route,/tx\.booking\.update/);});
test('manual payment keeps Thyrocare scope and balance validation',()=>{assert.match(route,/createdByAdmin:'THYROCARE_MANUAL'/);assert.match(route,/PAYMENT_EXCEEDS/);assert.match(route,/DISCOUNT_EXCEEDS/);});
