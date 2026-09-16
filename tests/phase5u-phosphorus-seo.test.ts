import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5U phosphorus Hyderabad SEO expansion', () => {
  const root = process.cwd();
  const phosphorusPath = path.join(root, 'app/phosphorus-test-hyderabad/page.tsx');
  const calcium = fs.readFileSync(path.join(root, 'app/calcium-test-hyderabad/page.tsx'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');

  it('publishes the intended phosphorus discovery metadata and safety wording', () => {
    expect(fs.existsSync(phosphorusPath)).toBe(true);
    const phosphorus = fs.readFileSync(phosphorusPath, 'utf8');
    expect(phosphorus).toContain('Serum Phosphorus Test in Hyderabad | TG Labs');
    expect(phosphorus).toContain('https://www.tglabs.in/phosphorus-test-hyderabad');
    expect(phosphorus).toContain("'@type': 'BreadcrumbList'");
    expect(phosphorus).toContain('does not replace medical advice');
    expect(phosphorus).toContain('does not guarantee a particular test, partner, price, pincode or collection slot');
  });

  it('connects the mineral discovery cluster and sitemap', () => {
    expect(calcium).toContain('href="/phosphorus-test-hyderabad"');
    expect(sitemap).toContain("{ route: '/phosphorus-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
