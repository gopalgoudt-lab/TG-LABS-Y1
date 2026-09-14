import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const analytics = fs.readFileSync('app/admin/analytics/page.tsx', 'utf8');
const chrome = fs.readFileSync('components/DashboardChrome.tsx', 'utf8');

test('Phase 4H analytics stays read-only and uses existing admin APIs', () => {
  assert.match(analytics, /fetch\('\/api\/admin\/bookings'/);
  assert.match(analytics, /fetch\('\/api\/admin\/catalog\/tests'/);
  assert.match(analytics, /fetch\('\/api\/admin\/catalog\/packages'/);
  assert.doesNotMatch(analytics, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
  assert.doesNotMatch(analytics, /prisma\.|DATABASE_URL|NEON_DATABASE_URL/);
});

test('Phase 4H exposes the planned operational BI metrics', () => {
  for (const label of [
    'Paid revenue',
    'Average order value',
    'Payment conversion',
    'Completion rate',
    'Cancellation rate',
    "Today's bookings",
    '7-day performance',
    'booking trend',
    'Top tests by booked items',
    'Partner booking mix',
  ]) assert.match(analytics, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('Admin navigation points Reports & Analytics to the Phase 4H page', () => {
  assert.match(chrome, /label:'Reports & Analytics',href:'\/admin\/analytics'/);
});
