import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad FBS page uses safe SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/fasting-blood-sugar-test-hyderabad/page.tsx');
  assert.match(page, /Fasting Blood Sugar Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/fasting-blood-sugar-test-hyderabad'/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /pincode/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /href="\/diabetes-test-hyderabad"/);
  assert.match(page, /href="\/hba1c-test-hyderabad"/);
});

test('FBS discovery page is linked from the Hyderabad hub and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const hub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /fasting-blood-sugar-test-hyderabad/);
  assert.match(hub, /href="\/fasting-blood-sugar-test-hyderabad"/);
});
