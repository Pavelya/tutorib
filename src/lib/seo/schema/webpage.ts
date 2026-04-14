import { buildCanonicalUrl, getSiteUrl } from '../metadata/canonical';
import { site } from '@/lib/config/site';

/**
 * WebPage JSON-LD for standard informational public pages.
 *
 * Used on: /how-it-works, /trust-and-safety, /become-a-tutor, etc.
 */
export function buildWebPage(options: {
  name: string;
  description: string;
  pathname: string;
}): Record<string, unknown> {
  const url = buildCanonicalUrl(options.pathname);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: options.name,
    description: options.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: site.name,
      url: getSiteUrl(),
    },
  };
}
