import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
async function loadPage(slug, rows = []) {
  const entry = `app/${slug}/page.tsx`;
  assert.ok(existsSync(entry), `Missing approved route: ${slug}`);
  const dir = mkdtempSync(path.resolve('.seo-test-'));
  try {
    await build({ entryPoints: [entry], outfile: `${dir}/page.cjs`, bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', plugins: [{ name: 'isolated-database', setup(b) {
      b.onResolve({ filter: /(^|\/)prisma$/ }, () => ({ path: 'db', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const prisma = { diagnosticPackage: { findMany: async () => globalThis.__seoPackages() } };', loader: 'js' }));
    }}] });
    globalThis.__seoPackages = () => { if (rows instanceof Error) throw rows; return rows; };
    const page = require(`${dir}/page.cjs`);
    return { metadata: page.metadata, html: renderToStaticMarkup(await page.default()) };
  } finally { delete globalThis.__seoPackages; rmSync(dir, { recursive: true, force: true }); }
}
const offer = { id: 'offer', price: 1499, mrp: 2000, availability: 'AVAILABLE', tat: '24 hours', active: true, sourceReference: 'fixture-source', lastVerifiedAt: new Date(), effectiveFrom: null, effectiveTo: null, partner: { id: 'thy', slug: 'thyrocare', name: 'Thyrocare', active: true, bookingEnabled: false, operationalEnabled: false, displayEnabled: true, accreditationDisplay: null, accreditationReference: null, accreditationVerifiedAt: null } };
const product = (slug, changes = {}) => ({ id: slug, slug, name: slug, active: true, packageType: 'PACKAGE', preparation: null, fastingNeeded: false, fastingHours: null, sampleTypes: ['Blood'], partnerOffers: [{ ...offer, ...changes }] });

test('local landing pages render centre contact and route-specific SEO metadata', async () => {
  for (const slug of ['thyrocare-sithaphalmandi', 'home-blood-test-sithaphalmandi', 'thyrocare-packages-sithaphalmandi']) {
    const { html, metadata } = await loadPage(slug);
    assert.equal(metadata.alternates.canonical, `https://www.tglabs.in/${slug}`);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.match(html, /href="tel:\+919701162302"/);
    assert.match(html, /href="https:\/\/wa.me\/919701162302/);
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(json.itemListElement.at(-1).item, metadata.alternates.canonical);
  }
});
test('package listings exclude invalid and other-partner offers without enabling booking', async () => {
  const rows = [product('Visible package'), product('Expired package', { effectiveTo: new Date('2000-01-01') }), product('Unverified package', { sourceReference: null }), product('Other lab', { partner: { ...offer.partner, slug: 'other' } }), product('Hidden partner', { partner: { ...offer.partner, displayEnabled: false } })];
  const { html } = await loadPage('thyrocare-packages-sithaphalmandi', rows);
  assert.match(html, /Visible package/);
  assert.match(html, /1,499/);
  assert.match(html, /Display only/);
  for (const hidden of ['Expired package', 'Unverified package', 'Other lab', 'Hidden partner']) assert.ok(!html.includes(hidden));
  assert.ok(!/href="\/(cart|checkout)/.test(html));
});
test('package page distinguishes no eligible listings from database unavailability', async () => {
  assert.match((await loadPage('thyrocare-packages-sithaphalmandi')).html, /No Thyrocare packages/);
  const { html } = await loadPage('thyrocare-packages-sithaphalmandi', new Error('private connection details'));
  assert.match(html, /temporarily unavailable/);
  assert.ok(!html.includes('private connection details'));
});
