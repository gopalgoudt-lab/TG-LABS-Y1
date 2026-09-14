import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad HbA1c page uses safe SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/hba1c-test-hyderabad/page.tsx');
  assert.match(page, /HbA1c Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/hba1c-test-hyderabad'/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /pincode/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /href="\/diabetes-test-hyderabad"/);
});

test('HbA1c discovery page is linked from the Hyderabad hub and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const hub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /hba1c-test-hyderabad/);
  assert.match(hub, /href="\/hba1c-test-hyderabad"/);
});
