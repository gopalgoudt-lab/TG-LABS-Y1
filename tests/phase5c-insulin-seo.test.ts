import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad insulin page uses safe SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/insulin-test-hyderabad/page.tsx');
  assert.match(page, /Insulin Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/insulin-test-hyderabad'/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /pincode/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /preparation instructions/);
  assert.match(page, /href="\/diabetes-test-hyderabad"/);
  assert.match(page, /href="\/fasting-blood-sugar-test-hyderabad"/);
  assert.match(page, /href="\/hba1c-test-hyderabad"/);
  assert.match(page, /href="\/glucose-tolerance-test-hyderabad"/);
});

test('Insulin page is linked from diabetes and Hyderabad hubs and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const diabetes = await read('app/diabetes-test-hyderabad/page.tsx');
  const hub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /insulin-test-hyderabad/);
  assert.match(diabetes, /href="\/insulin-test-hyderabad"/);
  assert.match(hub, /href="\/insulin-test-hyderabad"/);
});
