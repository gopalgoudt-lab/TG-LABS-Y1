import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad RBS page uses safe SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/random-blood-sugar-test-hyderabad/page.tsx');
  assert.match(page, /Random Blood Sugar Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/random-blood-sugar-test-hyderabad'/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /pincode/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /href="\/diabetes-test-hyderabad"/);
  assert.match(page, /href="\/fasting-blood-sugar-test-hyderabad"/);
  assert.match(page, /href="\/postprandial-blood-sugar-test-hyderabad"/);
  assert.match(page, /href="\/hba1c-test-hyderabad"/);
});

test('RBS page is linked from diabetes and Hyderabad hubs and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const diabetes = await read('app/diabetes-test-hyderabad/page.tsx');
  const hub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /random-blood-sugar-test-hyderabad/);
  assert.match(diabetes, /href="\/random-blood-sugar-test-hyderabad"/);
  assert.match(hub, /href="\/random-blood-sugar-test-hyderabad"/);
});
