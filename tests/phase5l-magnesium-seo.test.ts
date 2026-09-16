import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5L magnesium SEO expansion', () => {
  it('publishes the magnesium discovery route with canonical metadata, internal discovery link, and sitemap entry', () => {
    const root = process.cwd();
    const pagePath = path.join(root, 'app/magnesium-test-hyderabad/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('Serum Magnesium Test in Hyderabad | TG Labs');
    expect(page).toContain("canonical: 'https://www.tglabs.in/magnesium-test-hyderabad'");
    expect(page).toContain("'@type': 'BreadcrumbList'");
    expect(page).toContain('does not replace medical advice');

    const calcium = fs.readFileSync(path.join(root, 'app/calcium-test-hyderabad/page.tsx'), 'utf8');
    expect(calcium).toContain('href="/magnesium-test-hyderabad"');

    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain("{ route: '/magnesium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
