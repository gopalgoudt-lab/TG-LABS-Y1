import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad CBC test page uses safe local SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/cbc-test-hyderabad/page.tsx');
  assert.match(page, /CBC Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/cbc-test-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /Complete Blood Count/);
  assert.match(page, /pincode/);
  assert.match(page, /health-blog\/cbc-test-explained/);
});

test('CBC discovery page is linked from Hyderabad diagnostic hub and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const diagnosticHub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /cbc-test-hyderabad/);
  assert.match(diagnosticHub, /href="\/cbc-test-hyderabad"/);
});
