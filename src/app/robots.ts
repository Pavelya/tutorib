import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const isProduction = baseUrl.includes('tutorib.com');

  // Non-production environments: block all crawling
  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // Production: allow public routes, block operational/authenticated routes
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // Class C: authenticated / operational
        '/auth/',
        '/setup/',
        '/settings/',
        '/notifications/',
        '/billing/',
        '/privacy/',
        '/messages/',
        '/lessons/',
        '/tutor/',
        '/internal/',
        // Class B: public but non-indexable product workflows
        '/match/',
        '/results/',
        '/compare/',
        '/book/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
