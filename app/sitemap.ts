import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.tglabs.in';
  const routes: Array<{ route: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }> = [
    { route: '/', changeFrequency: 'daily', priority: 1 },
    { route: '/compare/labs', changeFrequency: 'weekly', priority: 0.8 },
    { route: '/contact-us', changeFrequency: 'monthly', priority: 0.6 },
    { route: '/privacy-policy', changeFrequency: 'monthly', priority: 0.4 },
    { route: '/terms', changeFrequency: 'monthly', priority: 0.4 },
    { route: '/data-deletion', changeFrequency: 'monthly', priority: 0.4 },
  ];

  return routes.map(({ route, changeFrequency, priority }) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
