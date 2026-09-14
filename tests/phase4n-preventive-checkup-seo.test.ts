import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad preventive checkup page uses safe local SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/full-body-checkup-hyderabad/page.tsx');
  assert.match(page, /Full Body Checkup in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/full-body-checkup-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /does not guarantee/);
  assert.match(page, /pincode/);
});

test('Preventive checkup discovery page is linked and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const homeCollection = await read('app/home-blood-test-hyderabad/page.tsx');
  assert.match(sitemap, /full-body-checkup-hyderabad/);
  assert.match(homeCollection, /href="\/full-body-checkup-hyderabad"/);
});
