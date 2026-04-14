import { buildCanonicalUrl } from '../metadata/canonical';

export interface BreadcrumbItem {
  /** Human-readable label */
  name: string;
  /** Route pathname, e.g. "/how-it-works" */
  pathname: string;
}

/**
 * BreadcrumbList JSON-LD for hierarchical public pages.
 *
 * @param items — ordered from root to current page. The last item is the current page.
 *
 * Usage:
 *   buildBreadcrumbList([
 *     { name: 'Home', pathname: '/' },
 *     { name: 'How It Works', pathname: '/how-it-works' },
 *   ])
 */
export function buildBreadcrumbList(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(item.pathname),
    })),
  };
}
