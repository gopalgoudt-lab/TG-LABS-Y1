import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { displayableOffers, publicOfferSelect } from '@/lib/catalog-data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://www.tglabs.in';
  const routes: Array<{ route: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
    { route: '/', changeFrequency: 'daily', priority: 1 },
    { route: '/compare/labs', changeFrequency: 'weekly', priority: 0.8 },
    { route: '/contact-us', changeFrequency: 'monthly', priority: 0.6 },
    { route: '/privacy-policy', changeFrequency: 'monthly', priority: 0.4 },
    { route: '/terms', changeFrequency: 'monthly', priority: 0.4 },
    { route: '/data-deletion', changeFrequency: 'monthly', priority: 0.4 },
  ];

  const [tests, packages] = await Promise.all([
    prisma.diagnosticTest.findMany({
      where: { active: true },
      select: { slug: true, active: true, updatedAt: true, partnerOffers: { select: publicOfferSelect } },
    }),
    prisma.diagnosticPackage.findMany({
      where: { active: true },
      select: { slug: true, active: true, packageType: true, updatedAt: true, partnerOffers: { select: publicOfferSelect } },
    }),
  ]);

  const now = new Date();
  const testRoutes: MetadataRoute.Sitemap = tests
    .filter((test) => displayableOffers(test, now).length > 0)
    .map((test) => ({
      url: `${base}/tests/${test.slug}`,
      lastModified: test.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

  const packageRoutes: MetadataRoute.Sitemap = packages
    .filter((item) => displayableOffers(item, now).length > 0)
    .map((item) => ({
      url: `${base}/${item.packageType === 'PROFILE' ? 'profiles' : 'packages'}/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  return [
    ...routes.map(({ route, changeFrequency, priority }) => ({ url: `${base}${route}`, lastModified: now, changeFrequency, priority })),
    ...testRoutes,
    ...packageRoutes,
  ];
}
