import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Block indexing on non-production environments
  const isProduction = baseUrl.includes('tutorib.com');

  return {
    rules: {
      userAgent: '*',
      allow: isProduction ? '/' : undefined,
      disallow: isProduction
        ? ['/auth/', '/setup/', '/settings', '/notifications', '/privacy', '/billing', '/internal/']
        : '/',
    },
    sitemap: isProduction ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
