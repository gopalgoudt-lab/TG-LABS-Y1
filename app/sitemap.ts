import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { displayableOffers, publicOfferSelect } from '@/lib/catalog-data';
import { healthArticles } from '@/lib/health-content';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.tglabs.in';
  const routes: Array<{ route: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
    { route: '/', changeFrequency: 'daily', priority: 1 },
    { route: '/diagnostic-tests-hyderabad', changeFrequency: 'weekly', priority: 0.85 },
    { route: '/home-blood-test-hyderabad', changeFrequency: 'weekly', priority: 0.82 },
    { route: '/thyrocare-sithaphalmandi', changeFrequency: 'weekly', priority: 0.84 },
    { route: '/full-body-checkup-hyderabad', changeFrequency: 'weekly', priority: 0.8 },
    { route: '/thyroid-test-hyderabad', changeFrequency: 'weekly', priority: 0.78 },
    { route: '/tsh-test-hyderabad', changeFrequency: 'weekly', priority: 0.76 },
    { route: '/t3-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/t4-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/diabetes-test-hyderabad', changeFrequency: 'weekly', priority: 0.77 },
    { route: '/hba1c-test-hyderabad', changeFrequency: 'weekly', priority: 0.76 },
    { route: '/fasting-blood-sugar-test-hyderabad', changeFrequency: 'weekly', priority: 0.76 },
    { route: '/postprandial-blood-sugar-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/random-blood-sugar-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/glucose-tolerance-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/insulin-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/homa-ir-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/c-peptide-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/fructosamine-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/urine-microalbumin-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/urine-acr-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/cbc-test-hyderabad', changeFrequency: 'weekly', priority: 0.76 },
    { route: '/vitamin-d-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/vitamin-b12-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/lipid-profile-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/liver-function-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/kidney-function-test-hyderabad', changeFrequency: 'weekly', priority: 0.75 },
    { route: '/uric-acid-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/electrolytes-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/sodium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/potassium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/chloride-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/calcium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/magnesium-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/phosphorus-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/serum-iron-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/creatinine-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/bun-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/urea-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/egfr-test-hyderabad', changeFrequency: 'weekly', priority: 0.74 },
    { route: '/compare/labs', changeFrequency: 'weekly', priority: 0.8 },
    { route: '/health-blog', changeFrequency: 'weekly', priority: 0.7 },
    { route: '/contact-us', changeFrequency: 'monthly', priority: 0.6 },
    { route: '/privacy-policy', changeFrequency: 'monthly', priority: 0.4 },
    { route: '/terms', changeFrequency: 'monthly', priority: 0.4 },
    { route: '/data-deletion', changeFrequency: 'monthly', priority: 0.4 },
  ];
  const [tests, packages] = await Promise.all([
    prisma.diagnosticTest.findMany({ where: { active: true }, select: { slug: true, active: true, updatedAt: true, partnerOffers: { select: publicOfferSelect } } }),
    prisma.diagnosticPackage.findMany({ where: { active: true }, select: { slug: true, active: true, packageType: true, updatedAt: true, partnerOffers: { select: publicOfferSelect } } }),
  ]);
  const now = new Date();
  const testRoutes: MetadataRoute.Sitemap = tests.filter((test) => displayableOffers(test, now).length > 0).map((test) => ({ url: `${base}/tests/${test.slug}`, lastModified: test.updatedAt, changeFrequency: 'weekly' as const, priority: 0.75 }));
  const packageRoutes: MetadataRoute.Sitemap = packages.filter((item) => displayableOffers(item, now).length > 0).map((item) => ({ url: `${base}/${item.packageType === 'PROFILE' ? 'profiles' : 'packages'}/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 }));
  const healthRoutes: MetadataRoute.Sitemap = healthArticles.map((article) => ({ url: `${base}/health-blog/${article.slug}`, lastModified: new Date(article.updated), changeFrequency: 'monthly' as const, priority: 0.65 }));
  return [...routes.map(({ route, changeFrequency, priority }) => ({ url: `${base}${route}`, lastModified: now, changeFrequency, priority })), ...testRoutes, ...packageRoutes, ...healthRoutes];
}
