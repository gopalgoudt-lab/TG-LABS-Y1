import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5M phosphorus SEO expansion', () => {
  it('publishes the phosphorus discovery route with canonical metadata, internal discovery link, and sitemap entry', () => {
    const root = process.cwd();
    const pagePath = path.join(root, 'app/phosphorus-test-hyderabad/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('Serum Phosphorus Test in Hyderabad | TG Labs');
    expect(page).toContain("canonical: 'https://www.tglabs.in/phosphorus-test-hyderabad'");
    expect(page).toContain("'@type': 'BreadcrumbList'");
    expect(page).toContain('does not replace medical advice');

    const magnesium = fs.readFileSync(path.join(root, 'app/magnesium-test-hyderabad/page.tsx'), 'utf8');
    expect(magnesium).toContain('href="/phosphorus-test-hyderabad"');

    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain("{ route: '/phosphorus-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});