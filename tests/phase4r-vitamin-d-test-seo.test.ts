import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad Vitamin D test page uses safe local SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/vitamin-d-test-hyderabad/page.tsx');
  assert.match(page, /Vitamin D Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/vitamin-d-test-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /Vitamin D/);
  assert.match(page, /pincode/);
  assert.match(page, /health-blog\/vitamin-d-test-guide/);
});

test('Vitamin D discovery page is linked from Hyderabad diagnostic hub and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const diagnosticHub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /vitamin-d-test-hyderabad/);
  assert.match(diagnosticHub, /href="\/vitamin-d-test-hyderabad"/);
});
