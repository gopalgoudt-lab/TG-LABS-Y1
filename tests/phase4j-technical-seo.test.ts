import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync('app/layout.tsx', 'utf8');
const structuredData = readFileSync('components/SiteStructuredData.tsx', 'utf8');
const robots = readFileSync('app/robots.ts', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');

test('root layout publishes site-wide structured data', () => {
  assert.match(layout, /SiteStructuredData/);
  assert.match(structuredData, /'@type': 'Organization'/);
  assert.match(structuredData, /'@type': 'WebSite'/);
  assert.match(structuredData, /https:\/\/www\.tglabs\.in/);
  assert.match(structuredData, /application\/ld\+json/);
});

test('structured data does not invent local address or medical claims', () => {
  assert.doesNotMatch(structuredData, /streetAddress|postalCode|telephone|openingHours/);
  assert.doesNotMatch(structuredData, /MedicalClinic|DiagnosticLab|Physician/);
});

test('crawler guidance keeps private workflows out of crawl targets', () => {
  assert.match(robots, /'\/admin'/);
  assert.match(robots, /'\/auth'/);
  assert.match(robots, /'\/checkout'/);
  assert.match(robots, /'\/patient'/);
  assert.match(robots, /'\/technician'/);
  assert.match(robots, /'\/api'/);
  assert.match(robots, /https:\/\/www\.tglabs\.in\/sitemap\.xml/);
});

test('public sitemap remains the discovery source for indexable content', () => {
  assert.match(sitemap, /\/health-blog/);
  assert.match(sitemap, /\/tests\/\$\{test\.slug\}/);
  assert.ok(sitemap.includes("`${base}/${item.packageType === 'PROFILE' ? 'profiles' : 'packages'}/${item.slug}`"));
  assert.match(sitemap, /\.\.\.packageRoutes/);
});
