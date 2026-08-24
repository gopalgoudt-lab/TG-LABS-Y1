import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/auth',
        '/checkout',
        '/manual',
        '/patient',
        '/technician',
        '/api',
      ],
    },
    sitemap: 'https://tglabs.in/sitemap.xml',
    host: 'https://tglabs.in',
  };
}
