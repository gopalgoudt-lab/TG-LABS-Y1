import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5R chloride SEO expansion', () => {
  it('publishes the chloride discovery route with canonical metadata, electrolyte-cluster discovery links, and sitemap entry', () => {
    const root = process.cwd();
    const pagePath = path.join(root, 'app/chloride-test-hyderabad/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('Chloride Test in Hyderabad | TG Labs');
    expect(page).toContain("canonical: 'https://www.tglabs.in/chloride-test-hyderabad'");
    expect(page).toContain("'@type': 'BreadcrumbList'");
    expect(page).toContain('does not replace medical advice');
    expect(page).toContain('does not guarantee a particular test, partner, price, pincode or collection slot');

    const electrolytes = fs.readFileSync(path.join(root, 'app/electrolytes-test-hyderabad/page.tsx'), 'utf8');
    expect(electrolytes).toContain('href=\"/chloride-test-hyderabad\"');

    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain("{ route: '/chloride-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
