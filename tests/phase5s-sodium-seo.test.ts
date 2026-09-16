import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5S sodium Hyderabad SEO expansion', () => {
  const root = process.cwd();
  const sodium = fs.readFileSync(path.join(root, 'app/sodium-test-hyderabad/page.tsx'), 'utf8');
  const electrolytes = fs.readFileSync(path.join(root, 'app/electrolytes-test-hyderabad/page.tsx'), 'utf8');
  const sitemap = fs.readFileSync(path.join(root, 'app/sitemap.ts'), 'utf8');

  it('publishes the intended sodium discovery metadata and safety wording', () => {
    expect(sodium).toContain('Serum Sodium Test in Hyderabad | TG Labs');
    expect(sodium).toContain("https://www.tglabs.in/sodium-test-hyderabad");
    expect(sodium).toContain("'@type': 'BreadcrumbList'");
    expect(sodium).toContain('does not replace medical advice');
    expect(sodium).toContain('does not guarantee a particular test, partner, price, pincode or collection slot');
  });

  it('connects the electrolyte cluster and sitemap', () => {
    expect(electrolytes).toContain('href="/sodium-test-hyderabad"');
    expect(sitemap).toContain("{ route: '/sodium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 }");
  });
});
