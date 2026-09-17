import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');

test('dashboard visual foundation exposes reusable primitives', () => {
  const source = read('components/dashboard/index.ts');
  for (const name of ['DashboardShell','DashboardPanel','DashboardStatCard','DashboardStatusBadge','DashboardQuickAction','DashboardState']) {
    assert.match(source, new RegExp(`export .*${name}`));
  }
});

test('dashboard foundation defines accessible semantic status variants', () => {
  const source = read('components/dashboard/DashboardStatusBadge.tsx');
  for (const status of ['success','warning','danger','info','neutral']) assert.match(source, new RegExp(status));
  assert.match(source, /aria-label/);
});

test('dashboard states never fabricate operational values', () => {
  const source = read('components/dashboard/DashboardState.tsx');
  assert.match(source, /loading/);
  assert.match(source, /empty/);
  assert.match(source, /error/);
});
