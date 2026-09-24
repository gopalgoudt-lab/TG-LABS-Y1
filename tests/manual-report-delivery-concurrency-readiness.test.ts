import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import test from 'node:test';
const route=readFileSync(new URL('../app/api/admin/thyrocare/report-delivery/route.ts',import.meta.url),'utf8');
test('manual report status update is transactional',()=>{const patch=route.slice(route.indexOf('export async function PATCH'));assert.match(patch,/\$transaction/);assert.match(patch,/tx\.booking\.findFirst/);assert.match(patch,/tx\.booking\.update/);assert.match(patch,/isolationLevel:'Serializable'/);});
test('report delivery mutation remains Thyrocare scoped and audited',()=>{assert.match(route,/createdByAdmin:'THYROCARE_MANUAL'/);assert.match(route,/THYROCARE_REPORT_STATUS_UPDATED/);});
