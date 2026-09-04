import assert from 'node:assert/strict';
import test from 'node:test';
import nextConfig from '../next.config.mjs';
import sitemap from '../app/sitemap';
import robots from '../app/robots';

test('legacy routes use permanent internal redirects', async () => {
  const redirects = await nextConfig.redirects?.();
  assert.ok(Array.isArray(redirects));

  const bySource = new Map(redirects.map((entry) => [entry.source, entry]));
  for (const source of ['/appointment', '/tests', '/health-check-packages', '/reports', '/contact.php']) {
    const entry = bySource.get(source);
    assert.ok(entry, `missing redirect for ${source}`);
    assert.equal(entry.permanent, true);
    assert.match(entry.destination, /^\//);
    assert.doesNotMatch(entry.destination, /^\/(?:admin|api)(?:\/|$)/);
  }

  assert.equal(bySource.get('/reports')?.destination, '/patient');
  assert.equal(bySource.get('/contact.php')?.destination, '/contact-us');
});

test('sitemap contains migrated public routes and excludes private routes', () => {
  const urls = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.ok(urls.includes('/'));
  assert.ok(urls.includes('/compare/labs'));
  assert.ok(urls.includes('/contact-us'));
  assert.ok(!urls.some((path) => path.startsWith('/admin')));
  assert.ok(!urls.some((path) => path.startsWith('/patient')));
  assert.ok(!urls.some((path) => path.startsWith('/checkout')));
});

test('robots protects operational and patient-private surfaces', () => {
  const value = robots();
  const rules = Array.isArray(value.rules) ? value.rules : [value.rules];
  const disallowed = rules.flatMap((rule) => Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []);
  for (const route of ['/admin', '/api', '/checkout', '/patient', '/technician']) {
    assert.ok(disallowed.includes(route), `${route} must remain disallowed`);
  }
});
