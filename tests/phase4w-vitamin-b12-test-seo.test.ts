import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad Vitamin B12 page uses safe SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/vitamin-b12-test-hyderabad/page.tsx');
  assert.match(page, /Vitamin B12 Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/vitamin-b12-test-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /pincode/);
  assert.match(page, /does not guarantee/);
});

test('Vitamin B12 discovery page is linked from the Hyderabad hub and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const hub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /vitamin-b12-test-hyderabad/);
  assert.match(hub, /href="\/vitamin-b12-test-hyderabad"/);
});
