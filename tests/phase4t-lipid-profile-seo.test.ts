import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Hyderabad lipid profile page uses safe local SEO metadata and live-catalog qualifiers', async () => {
  const page = await read('app/lipid-profile-test-hyderabad/page.tsx');
  assert.match(page, /Lipid Profile Test in Hyderabad \| TG Labs/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/lipid-profile-test-hyderabad'/);
  assert.match(page, /BreadcrumbList/);
  assert.match(page, /live TG Labs catalog/);
  assert.match(page, /does not diagnose/);
  assert.match(page, /pincode/);
  assert.match(page, /cholesterol/);
});

test('Lipid profile discovery page is linked from Hyderabad diagnostic hub and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const diagnosticHub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  assert.match(sitemap, /lipid-profile-test-hyderabad/);
  assert.match(diagnosticHub, /href="\/lipid-profile-test-hyderabad"/);
});
