import { getSiteUrl } from '../metadata/canonical';
import { site } from '@/lib/config/site';

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
    name: site.name,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: site.description,
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
    name: site.name,
    url: siteUrl,
  };
}
