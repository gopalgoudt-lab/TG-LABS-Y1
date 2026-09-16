import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5K calcium SEO expansion', () => {
  it('publishes the calcium discovery route with canonical metadata, internal discovery link, and sitemap entry', () => {
    const root = process.cwd();
    const pagePath = path.join(root, 'app/calcium-test-hyderabad/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('Serum Calcium Test in Hyderabad | TG Labs');
    expect(page).toContain("canonical: 'https://www.tglabs.in/calcium-test-hyderabad'");
    expect(page).toContain("'@type': 'BreadcrumbList'");
    expect(page).toContain('does not replace medical advice');

    const electrolytes = fs.readFileSync(path.join(root, 'app/electrolytes-test-hyderabad/page.tsx'), 'utf8');
    expect(electrolytes).toContain('href="/calcium-test-hyderabad"');

    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain("{ route: '/calcium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
