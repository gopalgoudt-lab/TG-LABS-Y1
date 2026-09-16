import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5T potassium Hyderabad SEO expansion', () => {
  const root = process.cwd();
  const potassiumPath = path.join(root, 'app/potassium-test-hyderabad/page.tsx');
  const electrolytes = fs.readFileSync(path.join(root, 'app/electrolytes-test-hyderabad/page.tsx'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');

  it('publishes the intended potassium discovery metadata and safety wording', () => {
    expect(fs.existsSync(potassiumPath)).toBe(true);
    const potassium = fs.readFileSync(potassiumPath, 'utf8');
    expect(potassium).toContain('Serum Potassium Test in Hyderabad | TG Labs');
    expect(potassium).toContain('https://www.tglabs.in/potassium-test-hyderabad');
    expect(potassium).toContain("'@type': 'BreadcrumbList'");
    expect(potassium).toContain('does not replace medical advice');
    expect(potassium).toContain('does not guarantee a particular test, partner, price, pincode or collection slot');
  });

  it('connects the electrolyte cluster and sitemap', () => {
    expect(electrolytes).toContain('href="/potassium-test-hyderabad"');
    expect(sitemap).toContain("{ route: '/potassium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});