import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/c-peptide-test-hyderabad/page.tsx', import.meta.url), 'utf8');
const hub = await readFile(new URL('../app/diabetes-test-hyderabad/page.tsx', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8');

test('Phase 5D C-peptide page has controlled SEO metadata', () => {
  assert.match(page, /title: 'C-Peptide Test in Hyderabad'/);
  assert.match(page, /canonical: 'https:\/\/www\.tglabs\.in\/c-peptide-test-hyderabad'/);
  assert.match(page, /robots: \{ index: true, follow: true \}/);
  assert.match(page, /BreadcrumbList/);
});

test('Phase 5D C-peptide page is connected to diabetes discovery cluster', () => {
  assert.match(hub, /href="\/c-peptide-test-hyderabad"/);
  assert.match(page, /href="\/diabetes-test-hyderabad"/);
  assert.match(page, /href="\/insulin-test-hyderabad"/);
  assert.match(page, /href="\/hba1c-test-hyderabad"/);
});

test('Phase 5D C-peptide route is in sitemap', () => {
  assert.match(sitemap, /route: '\/c-peptide-test-hyderabad'/);
});
