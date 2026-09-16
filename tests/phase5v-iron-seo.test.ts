import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5V serum iron Hyderabad SEO expansion', () => {
  const root = process.cwd();
  const ironPath = path.join(root, 'app/serum-iron-test-hyderabad/page.tsx');
  const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');

  it('publishes the intended serum iron discovery metadata and safety wording', () => {
    assert.equal(fs.existsSync(ironPath), true);
    const iron = fs.readFileSync(ironPath, 'utf8');
    assert.ok(iron.includes('Serum Iron Test in Hyderabad | TG Labs'));
    assert.ok(iron.includes('https://www.tglabs.in/serum-iron-test-hyderabad'));
    assert.ok(iron.includes("'@type': 'BreadcrumbList'"));
    assert.ok(iron.includes('does not replace medical advice'));
    assert.ok(iron.includes('does not guarantee a particular test, partner, price, pincode or collection slot'));
  });

  it('connects the iron discovery cluster and sitemap', () => {
    assert.ok(sitemap.includes("{ route: '/serum-iron-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }"));
  });
});
