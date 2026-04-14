import { buildCanonicalUrl, getSiteUrl } from '../metadata/canonical';
import { site } from '@/lib/config/site';

/**
 * HelpPage JSON-LD for the /support route.
 *
 * Only use when the page contains genuine, visible help content.
 */
export function buildHelpPage(options: {
  name: string;
  description: string;
  pathname: string;
}): Record<string, unknown> {
  const url = buildCanonicalUrl(options.pathname);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    additionalType: 'https://schema.org/HelpPage',
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
