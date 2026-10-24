import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Thyrocare manual order mutations can write audit rows through the active transaction', () => {
  const audit = fs.readFileSync('lib/admin-audit.ts', 'utf8');
  const route = fs.readFileSync('app/api/admin/thyrocare/orders/manage/route.ts', 'utf8');

  assert.match(audit, /writeAdminAudit[\s\S]*?client/);
  assert.match(audit, /client\.adminAuditLog\.create/);
  assert.match(route, /writeAdminAudit\(request,[\s\S]*?,\s*tx\)/);
});
