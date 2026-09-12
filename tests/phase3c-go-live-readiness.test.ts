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

test('AI health report next-test suggestions are conservative and report-grounded', () => {
  const route = readFileSync(new URL('../app/api/patient/reports/[id]/ai/route.ts', import.meta.url), 'utf8');

  assert.ok(route.includes('SUGGESTED NEXT TESTS TO DISCUSS WITH YOUR DOCTOR'));
  assert.ok(route.includes('Suggested test | Finding that prompted it | Why it may be useful | Suggested discussion/timing'));
  assert.ok(route.includes('clear clinical connection to a specific abnormal, borderline, or otherwise clinically relevant finding'));
  assert.ok(route.includes('Do not suggest broad screening panels, unrelated tests, or tests merely because they are common'));
  assert.ok(route.includes('Do not say the patient "needs", "must get", or "should definitely get"'));
  assert.ok(route.includes('Suggest no more than 5 next tests'));
  assert.ok(route.includes('no specific additional test is clearly suggested from the report alone'));
});
