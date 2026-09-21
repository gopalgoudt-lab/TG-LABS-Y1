import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const page=fs.readFileSync('app/admin/accounts-logistics/page.tsx','utf8');
const chrome=fs.readFileSync('components/DashboardChrome.tsx','utf8');
test('accounts logistics stays inside existing admin auth shell',()=>{assert.match(chrome,/Accounts & Logistics/);assert.match(chrome,/\/admin\/accounts-logistics/);assert.match(chrome,/\/api\/admin\/session/);});
test('dashboard is read only and reuses operations data',()=>{assert.match(page,/fetch\('\/api\/admin\/operations'/);assert.doesNotMatch(page,/method:\s*['"](?:POST|PATCH|PUT|DELETE)/);});
test('dashboard exposes accounts and logistics signals',()=>{for(const x of ['Paid booking value','Paid bookings','Pending / unpaid','Home collections active','Need technician','Samples in movement','Printed reports pending','Operational queue'])assert.match(page,new RegExp(x));});
test('operational actions remain delegated to existing workspaces',()=>{assert.match(page,/\/admin\/bookings/);assert.match(page,/\/admin\/operations/);assert.match(page,/Use the existing Operations workspace/);});
