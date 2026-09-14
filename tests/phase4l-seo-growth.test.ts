import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad discovery page has safe local SEO metadata and eligibility language', async () => {
  const page = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(page, /Diagnostic Tests in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/diagnostic-tests-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /pincode/);
  assert.match(page, /does not guarantee/);
});

test('Hyderabad discovery page is crawlable from sitemap and health hub', async () => {
  const sitemap = await read('app/sitemap.ts');
  const healthBlog = await read('app/health-blog/page.tsx');
  assert.match(sitemap, /diagnostic-tests-hyderabad/);
  assert.match(healthBlog, /href="\/diagnostic-tests-hyderabad"/);
});
