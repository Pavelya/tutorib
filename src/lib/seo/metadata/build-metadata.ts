import type { Metadata } from 'next';
import { buildCanonicalUrl } from './canonical';
import { buildOpenGraph } from './open-graph';
import { site } from '@/lib/config/site';

/**
 * Input contract for the metadata builder.
 * Routes own the intent — this builder turns it into a well-formed Metadata object.
 */
export interface RouteMetadataInput {
  /** Page-specific title (brand suffix added by template) */
  title: string;
  /** Page-specific meta description */
  description: string;
  /** Route pathname, e.g. "/how-it-works" */
  pathname: string;
  /** Whether the page should be indexable (default: true for Class A) */
  indexable?: boolean;
  /** Open Graph type override */
  ogType?: 'website' | 'article' | 'profile';
  /** Custom OG images */
  ogImages?: NonNullable<NonNullable<Metadata['openGraph']>['images']>;
  /** Additional metadata to merge */
  extra?: Metadata;
}

/**
 * Build complete route metadata from a route-owned input object.
 *
 * Usage in a static page:
 *   export const metadata = buildRouteMetadata({ title: '…', description: '…', pathname: '/…' });
 *
 * Usage in generateMetadata:
 *   return buildRouteMetadata({ title: tutor.name, description: '…', pathname: `/tutors/${tutor.slug}` });
 */
export function buildRouteMetadata(input: RouteMetadataInput): Metadata {
  const {
    title,
    description,
    pathname,
    indexable = true,
    ogType,
    ogImages,
    extra,
  } = input;

  const canonical = buildCanonicalUrl(pathname);

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: buildOpenGraph({
      title: typeof title === 'string' ? title : site.name,
      description,
      pathname,
      type: ogType,
      images: ogImages,
    }),
    twitter: {
      card: 'summary_large_image',
      title: typeof title === 'string' ? title : site.name,
      description,
    },
    ...extra,
  };

  return metadata;
}
