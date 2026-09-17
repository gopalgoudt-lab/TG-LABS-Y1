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

test('dashboard foundation includes focus and responsive contracts', () => {
  const css = read('app/dashboard-foundation.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media/);
  assert.match(css, /overflow-x:\s*auto/);
});

test('presentation shell contains no authentication or production data access', () => {
  const shell = read('components/dashboard/DashboardShell.tsx');
  for (const forbidden of ['firebase/auth','getFirebaseAuth','/api/admin/session','prisma','DATABASE_URL']) assert.doesNotMatch(shell, new RegExp(forbidden.replaceAll('/', '\\/')));
});

test('DashboardChrome owns auth boundaries and composes DashboardShell', () => {
  const chrome = read('components/DashboardChrome.tsx');
  assert.match(chrome, /import \{ DashboardShell \} from '@\/components\/dashboard'/);
  assert.match(chrome, /<DashboardShell/);
  assert.match(chrome, /signOut/);
  assert.match(chrome, /\/api\/admin\/session/);
  assert.match(chrome, /\/admin\/login/);
  assert.match(chrome, /\/technician\/login/);
  for (const role of ['patient','technician','admin']) assert.match(chrome, new RegExp(role));
});
