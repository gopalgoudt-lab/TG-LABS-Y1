import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path:string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const routes = [
  ['TSH', 'tsh-test-hyderabad'],
  ['T3', 't3-test-hyderabad'],
  ['T4', 't4-test-hyderabad'],
] as const;

test('Phase 4S thyroid expansion pages use canonical metadata, breadcrumbs and safe live-catalog qualifiers', async () => {
  for (const [label, slug] of routes) {
    const page = await read(`app/${slug}/page.tsx`);
    assert.match(page, new RegExp(`${label} Test in Hyderabad \\| TG Labs`));
    assert.match(page, new RegExp(`canonical: 'https:\\/\\/www\\.tglabs\\.in\\/${slug}'`));
    assert.match(page, /BreadcrumbList/);
    assert.match(page, /live TG Labs catalog/);
    assert.match(page, /does not diagnose/);
    assert.match(page, /pincode/);
    assert.match(page, /qualified clinician/);
  }
});

test('Thyroid hub expands TSH, T3 and T4 discovery without static availability claims', async () => {
  const thyroid = await read('app/thyroid-test-hyderabad/page.tsx');
  assert.match(thyroid, /TSH, T3, T4 and thyroid profiles/);
  assert.match(thyroid, /href="\/tsh-test-hyderabad"/);
  assert.match(thyroid, /href="\/t3-test-hyderabad"/);
  assert.match(thyroid, /href="\/t4-test-hyderabad"/);
  assert.match(thyroid, /does not diagnose/);
  assert.match(thyroid, /live TG Labs catalog/);
});

test('TSH, T3 and T4 pages are internally linked and included in sitemap', async () => {
  const sitemap = await read('app/sitemap.ts');
  const diagnosticHub = await read('app/diagnostic-tests-hyderabad/page.tsx');
  for (const [, slug] of routes) {
    assert.match(sitemap, new RegExp(slug));
    assert.match(diagnosticHub, new RegExp(`href="\\/${slug}"`));
  }
});
