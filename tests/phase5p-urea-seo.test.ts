import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5P urea SEO expansion', () => {
  it('publishes the urea discovery route with canonical metadata, kidney-cluster discovery link, and sitemap entry', () => {
    const root = process.cwd();
    const pagePath = path.join(root, 'app/urea-test-hyderabad/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('Serum Urea Test in Hyderabad | TG Labs');
    expect(page).toContain("canonical: 'https://www.tglabs.in/urea-test-hyderabad'");
    expect(page).toContain("'@type': 'BreadcrumbList'");
    expect(page).toContain('does not replace medical advice');
    expect(page).toContain('does not guarantee a particular test, partner, price, pincode or collection slot');

    const bun = fs.readFileSync(path.join(root, 'app/bun-test-hyderabad/page.tsx'), 'utf8');
    expect(bun).toContain('href=\"/urea-test-hyderabad\"');

    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain("{ route: '/urea-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
