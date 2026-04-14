import type { MetadataRoute } from 'next';
import { site, isProduction } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = site.url.replace(/\/$/, '');

  // Non-production environments: block all crawling
  if (!isProduction()) {
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
