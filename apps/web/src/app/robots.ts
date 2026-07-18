import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio.wavise.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Block API internals and authenticated app areas from indexing.
      disallow: [
        '/api/',
        '/_next/',
        '/dashboard',
        '/studio',
        '/billing',
        '/credits',
        '/projects',
        '/jobs',
        '/assets',
        '/settings',
        '/maintenance',
        '/reset-password',
        '/verify-email',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
