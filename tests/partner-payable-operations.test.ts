import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const create=fs.readFileSync('app/api/admin/accounts-logistics/payables/route.ts','utf8');
const update=fs.readFileSync('app/api/admin/accounts-logistics/payables/[id]/route.ts','utf8');
test('payable writes require admin session and audit',()=>{for(const s of [create,update]){assert.match(s,/adminFromRequest\(request\)/);assert.match(s,/writeAdminAudit\(request/)}});
test('creation uses recorded booking partner and no automatic cost formula',()=>{assert.match(create,/Partner is not recorded on this booking/);assert.match(create,/partnerPayable\.create/);assert.doesNotMatch(create,/margin|percentage|discount.*partner/i)});
test('lifecycle protects financial integrity',()=>{assert.match(update,/Paid amount cannot exceed payable amount/);assert.match(update,/PAID requires the full payable amount/);assert.match(update,/PARTIALLY_PAID requires an amount greater than zero/);assert.match(update,/Invoice number is required before approval/);assert.doesNotMatch(update,/partnerPayable\.delete/);});
