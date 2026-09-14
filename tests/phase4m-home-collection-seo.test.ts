import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad home blood test page has safe local SEO metadata and conditional availability language', async () => {
  const page = await read('app/home-blood-test-hyderabad/page.tsx');
  assert.match(page, /Home Blood Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/home-blood-test-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /pincode/);
  assert.match(page, /not guaranteed/);
  assert.match(page, /selected partner offer/);
});

test('Home collection discovery page is linked and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const hyderabad = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /home-blood-test-hyderabad/);
  assert.match(hyderabad, /href="\/home-blood-test-hyderabad"/);
});
