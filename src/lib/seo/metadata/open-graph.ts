import type { Metadata } from 'next';
import { buildCanonicalUrl, getSiteUrl } from './canonical';

/**
 * Build Open Graph metadata for a public route.
 *
 * Every public page should define og:title, og:description, og:url, og:type,
 * and og:image. This helper provides sensible defaults that routes can override.
 */
export function buildOpenGraph(options: {
  title: string;
  description: string;
  pathname: string;
  type?: 'website' | 'article' | 'profile';
  images?: NonNullable<NonNullable<Metadata['openGraph']>['images']>;
}): NonNullable<Metadata['openGraph']> {
  const { title, description, pathname, type = 'website', images } = options;
  const url = buildCanonicalUrl(pathname);
  const siteUrl = getSiteUrl();

  return {
    title,
    description,
    url,
    type,
    siteName: 'Tutor IB',
    locale: 'en_US',
    images: images ?? [
      {
        url: `${siteUrl}/og-default.png`,
        width: 1200,
        height: 630,
        alt: 'Tutor IB — Find the right IB tutor',
      },
    ],
  };
}
