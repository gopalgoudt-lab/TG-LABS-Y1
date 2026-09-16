import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5U phosphorus Hyderabad SEO expansion', () => {
  const root = process.cwd();
  const phosphorusPath = path.join(root, 'app/phosphorus-test-hyderabad/page.tsx');
  const calcium = fs.readFileSync(path.join(root, 'app/calcium-test-hyderabad/page.tsx'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');

  it('publishes the intended phosphorus discovery metadata and safety wording', () => {
    assert.equal(fs.existsSync(phosphorusPath), true);
    const phosphorus = fs.readFileSync(phosphorusPath, 'utf8');
    assert.ok(phosphorus.includes('Serum Phosphorus Test in Hyderabad | TG Labs'));
    assert.ok(phosphorus.includes('https://www.tglabs.in/phosphorus-test-hyderabad'));
    assert.ok(phosphorus.includes("'@type': 'BreadcrumbList'"));
    assert.ok(phosphorus.includes('does not replace medical advice'));
    assert.ok(phosphorus.includes('does not guarantee a particular test, partner, price, pincode or collection slot'));
  });

  it('connects the mineral discovery cluster and sitemap', () => {
    assert.ok(calcium.includes('href="/phosphorus-test-hyderabad"'));
    assert.ok(sitemap.includes("{ route: '/phosphorus-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }"));
  });
});
