import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5Q eGFR SEO expansion', () => {
  it('publishes the eGFR discovery route with canonical metadata, kidney-cluster discovery links, and sitemap entry', () => {
    const root = process.cwd();
    const pagePath = path.join(root, 'app/egfr-test-hyderabad/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);

    const page = fs.readFileSync(pagePath, 'utf8');
    expect(page).toContain('eGFR Test in Hyderabad | TG Labs');
    expect(page).toContain("canonical: 'https://www.tglabs.in/egfr-test-hyderabad'");
    expect(page).toContain("'@type': 'BreadcrumbList'");
    expect(page).toContain('does not replace medical advice');
    expect(page).toContain('does not guarantee a particular test, partner, price, pincode or collection slot');

    const creatinine = fs.readFileSync(path.join(root, 'app/creatinine-test-hyderabad/page.tsx'), 'utf8');
    expect(creatinine).toContain('href=\"/egfr-test-hyderabad\"');

    const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');
    expect(sitemap).toContain("{ route: '/egfr-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
