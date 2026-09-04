import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sitemap from '../app/sitemap';
import robots from '../app/robots';

const productionOrigin = 'https://www.tglabs.in';

test('root metadata uses the Phase 3B primary www origin', () => {
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.ok(layout.includes(`const siteUrl = '${productionOrigin}';`));
  assert.ok(!layout.includes("const siteUrl = 'https://tglabs.in';"));
});

test('sitemap emits only canonical www URLs', () => {
  const entries = sitemap();
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.equal(new URL(entry.url).origin, productionOrigin);
  }
});

test('robots advertises the canonical www host and keeps private routes blocked', () => {
  const value = robots();
  assert.equal(value.host, productionOrigin);
  assert.equal(value.sitemap, `${productionOrigin}/sitemap.xml`);

  const rules = Array.isArray(value.rules) ? value.rules : [value.rules];
  const disallowed = rules.flatMap((rule) => Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []);
  for (const route of ['/admin', '/api', '/checkout', '/patient', '/technician']) {
    assert.ok(disallowed.includes(route), `${route} must remain disallowed`);
  }
});
