import { getSiteUrl } from '../metadata/canonical';

/**
 * Organization JSON-LD for the home page and brand-level pages.
 *
 * Only includes fields backed by stable, real values.
 */
export function buildOrganization(): Record<string, unknown> {
  const siteUrl = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tutor IB',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      'Tutor IB connects IB students with qualified tutors matched to their learning needs.',
  };
}

/**
 * WebSite JSON-LD for the home page.
 * Establishes the site as a known entity for search.
 */
export function buildWebSite(): Record<string, unknown> {
  const siteUrl = getSiteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tutor IB',
    url: siteUrl,
  };
}
